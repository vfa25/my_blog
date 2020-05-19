---
title: 'case'
date: '2020-04-24'
---

## WebView

- 描述：Android打开WebView出现net::ERR_UNKNOWN_URL_SCHEME错误
- 解决：http/https协议url在本页用webview进行加载，自定义协议的链接跳转，交给系统浏览器处理。
- 参考：[shouldOverrideUrlLoading API](
https://developer.android.google.cn/reference/android/webkit/WebViewClient#shouldOverrideUrlLoading(android.webkit.WebView,%20android.webkit.WebResourceRequest))

<details>
<summary>解决：Android打开WebView出现net::ERR_UNKNOWN_URL_SCHEME错误</summary>

```java
// MyWebViewManager.java
import android.content.Intent;
import android.net.Uri;
import android.webkit.WebResourceRequest;
import android.webkit.WebView;
import androidx.annotation.RequiresApi;

import com.facebook.react.uimanager.ThemedReactContext;
import com.reactnativecommunity.webview.RNCWebViewManager;

class MyWebViewManager extends RNCWebViewManager {
    private static class MyWebViewClient extends RNCWebViewManager.RNCWebViewClient {
        private ThemedReactContext mContext;

        private MyWebViewClient(ThemedReactContext context) {
            this.mContext = context;
        }

        @Override
        @RequiresApi(24)
        public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
            Uri uri = request.getUrl();
            return handleUri(uri);
        }

        @Override
        public boolean shouldOverrideUrlLoading(WebView view, String url) {
            Uri uri = Uri.parse(url);
            return handleUri(uri);
        }

        private boolean handleUri(Uri uri) {
            String scheme = uri.getScheme();
            if(scheme != null && (scheme.equalsIgnoreCase("http") ||
                    scheme.equalsIgnoreCase("https"))) {
                return false;
            }
            Intent intent = new Intent(Intent.ACTION_VIEW, uri);
            mContext.startActivity(intent);
            return true;
        }
    }
}
```

</details>
