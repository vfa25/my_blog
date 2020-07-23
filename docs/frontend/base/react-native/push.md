---
title: "消息推送"
date: "2020-7-15"
sidebarDepth: 3
---

集成推送SDK。SDK指路👉开放平台[npns sdk推送服务文档](https://www.nationsky.com/docs/npns-sdk-%e9%9b%86%e6%88%90/)。

- 需求：获取到推送后，弹出通知，并在点击后跳转至该应用的指定界面。
- 需求分析：
  - 首先类继承自`BroadcastReceiver`，用于接收服务器推送通知。
  - 由于Java并无多继承，那么要想通知到JS代码，需通过`Native Module`中转，类似于传球的方式。
  - 需要注意的是
    - 对于`npns sdk`注册时的通知，由于此时RN应用可能还未完全初始化（JS代码未执行），故需先进行缓存，等待主动查询。
    - 对于`npns sdk`一般情况下的通知，需处理`通知显示`以及`点击通知`后的回调。

## 配置`AndroidManifest.xml`

APP推送功能，是应用与操作系统最密切相关的。比如某些场景：应用未运行、需要操作系统调起应用。
而告知操作系统，应用关心哪些推送则需配置`AndroidManifest.xml`。

### 1. 添加权限

```xml
<!-- if you want to use NPNS SDK ,you should add follow permission -->
<!-- 应用程序的包名 applicationId 通过在 build.gradle 配置 defaultConfig -->
<permission android:name="${applicationId}.permission.MESSAGE" />
<uses-permission android:name="${applicationId}.permission.MESSAGE" />
<uses-permission android:name="android.permission.WAKE_LOCK" />
<uses-permission android:name="android.permission.GET_TASKS" /> <!-- not PROTECTION_NORMAL -->
<uses-permission android:name="android.permission.ACCESS_WIFI_STATE" />
<uses-permission android:name="android.permission.WRITE_SETTINGS" /> <!-- not PROTECTION_NORMAL -->
<uses-permission android:name="android.permission.READ_PHONE_STATE" /> <!-- not PROTECTION_NORMAL -->
<uses-permission android:name="android.permission.VIBRATE" />
<uses-permission android:name="android.permission.RECEIVE_BOOT_COMPLETED" />
<!-- Permissions for PN end -->
```

### 2. 添加账号

在工作台注册应用后获取各项信息，推送sdk初始化时会读取该处配置。

```xml
<meta-data android:name="NPNS_APP_ID" android:value="Your App ID"/>
<meta-data android:name="NPNS_ACCOUNT_ID" android:value="Your sender ID"/>
```

### 3. 添加SDK的相关Services及组件

```xml
<receiver android:name="com.nationsky.npns.receiver.NpnsPackageReceiver">
    <intent-filter>
        <action android:name="android.intent.action.PACKAGE_REMOVED" />
        <data android:scheme="package" />
    </intent-filter>
    <intent-filter>
        <action android:name="com.nq.npns.android.intent.MASTERCHANGED" />
    </intent-filter>
</receiver>
<receiver android:name="com.nationsky.npns.receiver.NpnsAutoStartReceiver">
    <intent-filter>
        <action android:name="android.intent.action.BOOT_COMPLETED" /> <!-- 系统在开机加载完毕后发送 -->
    </intent-filter>
</receiver>

<service android:name="com.nationsky.npns.Service">
    <intent-filter>
        <action android:name="com.nq.npns.android.intent.CHECK" />
        <action android:name="com.nq.npns.android.intent.REGISTER" />
        <action android:name="com.nq.npns.android.intent.UNREGISTER" />
        <action android:name="com.nq.npns.android.intent.RECONNECT" />
    </intent-filter>
</service>
```

### 4. 添加MA至`BroadcastReceiver`组件

- NPNS通过发广播的方式向MA(Mobile Application)发送和推送消息。要获取NPNS发送的相关消息， MA需要注册相关的广播监听器。
- 需要自定义一个用于接收NPNS消息的`BroadcastReceiver`类，其配置文件如下，其中`PnReceiver`为自定义的类名。

```xml
<receiver android:name="${applicationId}.PnReceiver">
    <intent-filter>
        <action android:name="com.nq.npns.android.intent.RECEIVE" />
    </intent-filter>
    <intent-filter>
        <action android:name="com.nq.npns.android.intent.REGISTRATION" />
    </intent-filter>
    <intent-filter>
        <action android:name="com.nq.npns.android.intent.UNREGISTER" />
    </intent-filter>
    <intent-filter>
        <action android:name="com.nq.npns.android.intent.RECONNECT" />
    </intent-filter>
    <intent-filter>
        <action android:name="com.nq.npns.android.intent.REGIDCHANGED" />
    </intent-filter>
</receiver>
```

## 处理推送

### 1. 自定义类接收系统推送

- 类`PnReceiver`继承自`BroadcastReceiver`，用于接收系统推送。
- 接收后则再次将消息广播到`PnModule`，后者继承自`ReactContextBaseJavaModule`，此时将数据传到JS层。
- 同时借助`SharedPreferences`的存储，也可以在`PnModule`未创建时，进行数据存储，被动查询。

```java
package com.mydemo.console;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.util.Log;
import androidx.localbroadcastmanager.content.LocalBroadcastManager;

public class PnReceiver extends BroadcastReceiver {
    private static final String TAG = "PnReceiver";

    static final String ACTION_REGISTRATION = "com.mydemo.console.registration";
    static final String ACTION_MESSAGE = "com.mydemo.console.message";
    static final String ACTION_DATA = "com.mydemo.console.data";
    static final String ACTION_MESSAGE_CLICKED = "com.mydemo.console.msgClicked";

    public void onReceive(Context context, Intent intent) {
        String receivedAction = intent.getAction();

        if (receivedAction == null) {
            return;
        }

        switch (receivedAction) {
        case NpnsPushManager.NPNS_ACTION_REGISTRATION:
            //注册的回调action 应用端需记录返回的registration_id
            handleRegistration(context, intent);
            break;
        case NpnsPushManager.NPNS_ACTION_UNREGISTRATION:
            //取消注册的回调action 解绑定后，应用将不会再收到新消息的通知
            handleUnRegistration(context, intent);
            break;
        case NpnsPushManager.NPNS_ACTION_RECEIVE:
            //PN收到新消息的回调action
            handleNewMessage(context, intent);
            break;
        case NpnsPushManager.NPNS_ACTION_RECONNECT:
            //重连的回调action， 应用需再次调用SDK.onRegister，并在回调记录新的registration_id
            handleReconnect(context);
            break;
        case NpnsPushManager.NPNS_ACTION_REGID_CHANGED:
            handleRegistration(context, intent);
            break;
        default:
            Log.w(TAG, "====== Received unexpected action: " + receivedAction);
            break;
        }
    }

    private void handleRegistration(Context context, Intent intent) {
        String regId = intent.getStringExtra(NpnsPushManager.NPNS_KEY_REG_ID);
        int errorCode = intent.getIntExtra(NpnsPushManager.NPNS_KEY_RESULT_CODE, 0);

        //若 errorCode == SUCCESS_CODE 且 regId 不为空
        Context ctx = context.getApplicationContext();
        LocalStore.saveData(ctx, "regId", regId);
        //此时广播PnModule尚未创建，无法接收，因此写到存储中供PnModule读取
        LocalStore.saveData(ctx, "registered", "true");
        //尝试广播出去
        broadcastAction(context, ACTION_REGISTRATION, regId);
    }

    private void handleUnRegistration(Context context, Intent intent) {
        int code = intent.getIntExtra(NpnsPushManager.NPNS_KEY_RESULT_CODE, 0);
        //获取错误码，若APP已注册则清除相关本地存储
        Context ctx = context.getApplicationContext();
        LocalStore.saveData(ctx, "regId", "");
        LocalStore.saveData(ctx, "registered", "");
    }

    private void handleNewMessage(Context context, Intent intent) {
        String message = intent.getStringExtra(NpnsPushManager.NPNS_KEY_MESSAGE);
        String realMessage = parseMessage(message); // 响应数据格式化
        Log.d(TAG, "====== Received message: " + message);
        if (realMessage != null) {
            broadcastAction(context, ACTION_MESSAGE, realMessage);
        }
    }

    private void handleReconnect(Context context) {
        try {
            NpnsPushManager.onRegister(context);
        } catch (Exception e) {
            Log.e(TAG, "====== Exception occurred in handleReconnect: " + e.getMessage());
        }
    }

    private void broadcastAction(Context context, String action, String data) {
        Intent it = new Intent(context, PnModule.class);
        //新的广播，此时action必须是新的命名，否则会死循环
        it.setAction(action);
        it.putExtra(ACTION_DATA, data);
        it.setPackage(context.getPackageName());
        LocalBroadcastManager.getInstance(context).sendBroadcast(it);
    }
}
```

### 2. 推送Native Module编写

- 在构造函数里实例化内部类`MyReceiver`，其继承自`BroadcastReceiver`，
并在`initialize`函数中注册了该监听器（同时，系统销毁时`onCatalystInstanceDestroy`应注销掉）。

```java
package com.mydemo.console;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.util.Log;

import androidx.annotation.NonNull;
import androidx.localbroadcastmanager.content.LocalBroadcastManager;

import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.Callback;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.modules.core.DeviceEventManagerModule;

public class PnModule extends ReactContextBaseJavaModule {
    private static final String TAG = "PnModule";
    private ReactApplicationContext mReactContext;
    private MyReceiver mReceiver;
    private boolean mRegStatus = false;
    private String mRegId = "";

    private final class MyReceiver extends BroadcastReceiver {
        private void emitEvent(String eventName, WritableMap params) {
            mReactContext.getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter.class)
                    .emit(eventName, params);
        }

        @Override
        public void onReceive(Context context, Intent intent) {
            String receivedAction = intent.getAction();
            WritableMap params;
            if (receivedAction != null) {
                switch (receivedAction) {
                case PnReceiver.ACTION_REGISTRATION:
                    String regId = intent.getStringExtra(PnReceiver.ACTION_DATA);
                    //PN注册成功早于JS代码的执行。如果此时emitEvent无法在JS里响应
                    //因此保存状态等待JS主动查询
                    if (regId != null && regId.length() > 0) {
                        mRegStatus = true;
                        mRegId = regId;
                    }
                    break;
                case PnReceiver.ACTION_MESSAGE:
                    String msg = intent.getStringExtra(PnReceiver.ACTION_DATA);
                    params = Arguments.createMap();
                    params.putString("message", msg);
                    emitEvent("messageReceived", params);
                    break;
                case PnReceiver.ACTION_MESSAGE_CLICKED:
                    int id = intent.getIntExtra(PnReceiver.ACTION_DATA, 0);
                    params = Arguments.createMap();
                    params.putInt("id", id);
                    params.putString("target", intent.getStringExtra("target"));
                    emitEvent("messageClicked", params);
                    break;
                default:
                    break;
                }
            }
        }
    }

    PnModule(ReactApplicationContext reactContext) {
        super(reactContext);

        mReactContext = reactContext;
        mReceiver = new MyReceiver();
    }

    @Override
    @NonNull
    public String getName() {
        return "PnModule";
    }

    @Override
    public void initialize() {
        super.initialize();

        IntentFilter filter = new IntentFilter();
        filter.addAction(PnReceiver.ACTION_REGISTRATION);
        filter.addAction(PnReceiver.ACTION_MESSAGE);
        filter.addAction(PnReceiver.ACTION_MESSAGE_CLICKED);
        LocalBroadcastManager.getInstance(mReactContext).registerReceiver(mReceiver, filter);
        Log.i(TAG, "====== Receiver registered");
    }

    @Override
    public void onCatalystInstanceDestroy() {
        try {
            LocalBroadcastManager.getInstance(mReactContext).unregisterReceiver(mReceiver);
            Log.i(TAG, "====== Receiver unregistered");
        } catch (Exception e) { /* noop */ }
        super.onCatalystInstanceDestroy();
    }

    @ReactMethod
    @SuppressWarnings("unused")
    public void getPnRegStatus(Callback callback) {
        //PnReceiver的创建和注册成功早于PnModule的创建，因此无法收到
        //第一个注册成功的广播，改为从Store读取
        Context ctx = mReactContext.getApplicationContext();
        if (!mRegStatus) {
            mRegStatus = LocalStore.getData(ctx, "registered").equals("true");
            mRegId = LocalStore.getData(ctx, "regId");
        }
        WritableMap info = Arguments.createMap();
        //import java.util.UUID; UUID.randomUUID().toString();
        info.putString("udid", LocalStore.getUniqueId(ctx));
        info.putInt("platform", 1);
        info.putString("token", mRegId);
        info.putString("pkgName", ctx.getPackageName());
        callback.invoke(mRegStatus, info);
    }

    @ReactMethod
    @SuppressWarnings("unused")
    public void showNotification(String message, int id, String target) {
        MyNotificationManager.getInstance(mReactContext).showNotification(message, id, target);
    }
}

```

### 3. 注册NPNS SDK及PnModule

1. 启动、注册NPNS

    在`MainApplication.java`的`onCreate`函数中

    ```java
    import com.nationsky.npns.NpnsPushManager;

    @Override
    public void onCreate() {
        // ...
        NpnsPushManager.startService(this);
        NpnsPushManager.onRegister(this);
    }
    ```

2. 注册推送Native Module：`PnPackage`

    ```java
    package com.mydemo.console;

    import androidx.annotation.NonNull;

    import java.util.ArrayList;
    import java.util.Collections;
    import java.util.List;

    import com.facebook.react.ReactPackage;
    import com.facebook.react.bridge.NativeModule;
    import com.facebook.react.bridge.ReactApplicationContext;
    import com.facebook.react.uimanager.ViewManager;

    public class PnPackage implements ReactPackage {
        @Override
        @NonNull
        public List<ViewManager> createViewManagers(@NonNull ReactApplicationContext reactContext) {
            return Collections.emptyList();
        }

        @Override
        @NonNull
        public List<NativeModule> createNativeModules(@NonNull ReactApplicationContext reactContext) {
            List<NativeModule> modules = new ArrayList<>();
            modules.add(new PnModule(reactContext));
            return modules;
        }
    }
    ```

    在`MainApplication.java`的`getPackages`函数中注册该package。

    ```java
    @Override
    protected List<ReactPackage> getPackages() {
        List<ReactPackage> packages = new PackageList(this).getPackages();
        // Packages that cannot be autolinked yet can be added manually here, for example:
        // packages.add(new MyReactNativePackage());
        packages.add(new PnPackage());
        return packages;
    }
    ```

### 4. JS处理推送的编写

- 在入口js文件中的`componentDidMount`钩子里注册监听器事件。
- 若用户登录态由`未登录`到`登录`，则尝试注册NPNS，并建立心跳连接；反之则清除。

```js
import { NativeEventEmitter } from "react-native";
import { Actions } from "react-native-router-flux";
addMessageListeners() {
    this.unsubscribeFunc = mainStore.subscribe(() => {
        const prevLoggedIn = this.loggedIn;
        this.loggedIn = mainStore.getState().login.loggedIn;
        if (!prevLoggedIn && this.loggedIn) {
            NativeModules.PnModule.getPnRegStatus((regStatus, info) => {
                if (regStatus) {
                    this.udid = info.udid;
                    App.registerPnToken(info);
                    this.heartTimer = setInterval(() => {
                        authAPI.heartbeat({
                            udid: this.udid,
                            platform: 1
                        });
                    }, 60000);
                }
            });
        } else if (prevLoggedIn && !this.loggedIn) {
            if (this.heartTimer) {
                clearInterval(this.heartTimer);
                this.heartTimer = null;
            }
        }
    });
    this.myEvtEmitter = this.myEvtEmitter || new NativeEventEmitter(NativeModules.PnModule);
    this.messageReceived = this.messageReceived ||
        this.myEvtEmitter.addListener("messageReceived", (e) => {
            if (e.message) {
                // 数据格式化
                const msgInfo = util.formatMessage(e.message);
                if (msgInfo) {
                    NativeModules.PnModule.showNotification(msgInfo.message,
                        msgInfo.deviceId, msgInfo.target);
                }
            }
        });
    this.messageClicked = this.messageClicked ||
        this.myEvtEmitter.addListener("messageClicked", (e) => {
            if (e.id) {
                setTimeout(() => {
                    Actions.deviceDetail({
                        deviceId: e.id,
                        target: e.target
                    });
                }, 200);
            }
        });
}
```

### 5. 编写通知的Java代码

- 从android操作系统的系统服务中得到通知服务、`NotificationManager`类型的对象。
- Android 8.x后需要建立`NotificationChannel`通道，详情查看👉[Developers Document](https://developer.android.google.cn/reference/kotlin/android/app/NotificationChannel)。

```java
package com.mydemo.console;

import android.app.Notification;
import android.app.Notification.BigTextStyle;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.graphics.Color;
//import android.media.AudioAttributes;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
//import android.provider.MediaStore;
import androidx.localbroadcastmanager.content.LocalBroadcastManager;

class MyNotificationManager {
    private static MyNotificationManager mInstance = null;
    private Context mContext;
    private NotificationManager mNotificationMgr;
    private int mId = 0;

    private MyNotificationManager(Context context) {
        mContext = context.getApplicationContext();
        mNotificationMgr = (NotificationManager)mContext.getSystemService(Context.NOTIFICATION_SERVICE);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(mContext.getPackageName(),
                    "console平台", NotificationManager.IMPORTANCE_HIGH);
            channel.enableVibration(true);
            channel.enableLights(true);
            channel.setLightColor(Color.RED);
            channel.setShowBadge(false);
//            AudioAttributes attr = new AudioAttributes.Builder()
//                    .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
//                    .setUsage(AudioAttributes.USAGE_NOTIFICATION_EVENT)
//                    .build();
//            channel.setSound(MediaStore.Audio.Media.INTERNAL_CONTENT_URI, attr);
            mNotificationMgr.createNotificationChannel(channel);
        }
    }

    static MyNotificationManager getInstance(Context context) {
        if (mInstance == null) {
            mInstance = new MyNotificationManager(context);
        }
        return mInstance;
    }

    void showNotification(String msg, int id, String target) {
        Bitmap bmp = BitmapFactory.decodeResource(mContext.getResources(), R.mipmap.ic_launcher);
        String title = "console平台 通知";
        String pkgName = mContext.getPackageName();
        Intent intent = new Intent(mContext, MainActivity.class);
        intent.setAction(pkgName + ".MESSAGE_CLICKED");
        intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_RESET_TASK_IF_NEEDED);
        intent.putExtra("id", id);
        intent.putExtra("target", target);
        PendingIntent pendingIntent = PendingIntent.getActivity(mContext, 0, intent,
                PendingIntent.FLAG_UPDATE_CURRENT);
        BigTextStyle txtStyle = new BigTextStyle().bigText(msg);
        Notification.Builder builder;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            builder = new Notification.Builder(mContext, pkgName)
                    .setChannelId(pkgName)
                    .setBadgeIconType(Notification.BADGE_ICON_SMALL)
                    .setNumber(1);
        } else {
            builder = new Notification.Builder(mContext)
                    .setDefaults(Notification.DEFAULT_ALL);
        }
        builder = builder.setContentTitle(title).setContentText(msg)
                .setLargeIcon(bmp).setSmallIcon(R.mipmap.ic_launcher)
                .setContentIntent(pendingIntent).setStyle(txtStyle)
                .setTicker(msg).setAutoCancel(true);
        Notification notification = builder.build();
        mNotificationMgr.notify(mId, notification);
        mId ++;
    }

//    void removeNotification() {
//        mNotificationMgr.cancel(0);
//    }
}

```
