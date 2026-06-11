import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  BackHandler,
  Linking,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

// The live site this app wraps. Keeping the app a thin WebView shell means it
// always matches what's deployed to poker.scarletbeast.com.
const APP_URL = 'https://poker.scarletbeast.com';
const APP_HOST = 'poker.scarletbeast.com';
const BRAND_BG = '#0b0b0f';
const BRAND_RED = '#c1121f';

// Tells the site it's running inside the native app so it renders tables in a
// bare, full-screen view (no shared chrome). `windows:false` → no OS windows on
// a phone, so the site swaps in-place instead of popping a new one.
const INJECT_APP_FLAG = `window.scarletbeastApp = { isApp: true, platform: ${JSON.stringify(Platform.OS)}, windows: false }; true;`;

function isInternal(url) {
  try {
    return new URL(url).host === APP_HOST;
  } catch {
    return false;
  }
}

export default function App() {
  const webRef = useRef(null);
  const canGoBack = useRef(false);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Android hardware back button → navigate the WebView's history first.
  useEffect(() => {
    if (Platform.OS !== 'android') return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (canGoBack.current && webRef.current) {
        webRef.current.goBack();
        return true; // handled — don't exit the app
      }
      return false; // let the OS close the app
    });
    return () => sub.remove();
  }, []);

  const reload = useCallback(() => {
    setFailed(false);
    setLoading(true);
    webRef.current?.reload();
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    webRef.current?.reload();
    // The WebView's onLoadEnd clears the spinner; guard against a hang.
    setTimeout(() => setRefreshing(false), 1500);
  }, []);

  // Open off-site links (banking, socials, mailto, etc.) in the real browser;
  // keep in-app navigation pinned to the poker origin.
  const onShouldStartLoad = useCallback((req) => {
    const { url } = req;
    if (url.startsWith('http') && !isInternal(url)) {
      Linking.openURL(url).catch(() => {});
      return false;
    }
    if (!url.startsWith('http') && !url.startsWith('about:')) {
      Linking.openURL(url).catch(() => {}); // tel:, mailto:, bitcoin:, etc.
      return false;
    }
    return true;
  }, []);

  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <SafeAreaView style={styles.safe} edges={['top', 'bottom', 'left', 'right']}>
        {failed ? (
          <ScrollView
            contentContainerStyle={styles.errorWrap}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={BRAND_RED} />}
          >
            <Text style={styles.errorTitle}>Can't reach the felt</Text>
            <Text style={styles.errorBody}>Check your connection and try again.</Text>
            <TouchableOpacity style={styles.retryBtn} onPress={reload} activeOpacity={0.8}>
              <Text style={styles.retryText}>Retry</Text>
            </TouchableOpacity>
          </ScrollView>
        ) : (
          <WebView
            ref={webRef}
            source={{ uri: APP_URL }}
            originWhitelist={['https://*']}
            injectedJavaScriptBeforeContentLoaded={INJECT_APP_FLAG}
            onShouldStartLoadWithRequest={onShouldStartLoad}
            onNavigationStateChange={(nav) => {
              canGoBack.current = nav.canGoBack;
            }}
            onLoadStart={() => setLoading(true)}
            onLoadEnd={() => {
              setLoading(false);
              setRefreshing(false);
            }}
            // onLoadEnd isn't always fired for JS-initiated (location.assign)
            // navigations, so also clear the overlay once the page is fully loaded.
            onLoadProgress={({ nativeEvent }) => {
              if (nativeEvent.progress >= 1) {
                setLoading(false);
                setRefreshing(false);
              }
            }}
            onError={() => {
              setLoading(false);
              setFailed(true);
            }}
            onHttpError={({ nativeEvent }) => {
              if (nativeEvent.statusCode >= 500) setFailed(true);
            }}
            pullToRefreshEnabled
            allowsBackForwardNavigationGestures
            decelerationRate={0.998}
            style={styles.web}
            containerStyle={styles.webContainer}
          />
        )}

        {loading && !failed && (
          <View style={styles.loader} pointerEvents="none">
            <ActivityIndicator size="large" color={BRAND_RED} />
          </View>
        )}
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BRAND_BG },
  web: { flex: 1, backgroundColor: BRAND_BG },
  webContainer: { backgroundColor: BRAND_BG },
  loader: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: BRAND_BG,
  },
  errorWrap: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  errorTitle: { color: BRAND_RED, fontSize: 24, fontWeight: '700', marginBottom: 8 },
  errorBody: { color: '#e7e7ea', opacity: 0.8, fontSize: 15, textAlign: 'center', marginBottom: 24 },
  retryBtn: { backgroundColor: BRAND_RED, paddingVertical: 12, paddingHorizontal: 36, borderRadius: 8 },
  retryText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
