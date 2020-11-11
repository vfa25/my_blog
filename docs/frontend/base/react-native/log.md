---
title: "日志"
date: "2020-11-6"
sidebarDepth: 3
---

日志对于定位问题，尤其是定位在客户环境中出现的问题是不可或缺的。

本篇需求为：将应用的JS日志，自定义文件名，并存储于指定路径下。

## Android实现

`Android端`使用的日志库是`Timber`，主页为：[https://github.com/JakeWharton/timber](https://github.com/JakeWharton/timber)。其内部使用了`Logback project`，主页为：[http://logback.qos.ch](http://logback.qos.ch)。

### 集成

集成时需要在`android/app/build.gradle`的`dependencies`增加：

```gradle
implementation "com.github.tony19:logback-android:2.0.0"
implementation "com.jakewharton.timber:timber:4.7.1"
```

### 实现

#### 日志相关

`Debug`和`Release`阶段对日志有不同的要求，需要不同的实现。

- 在`Debug`时，使用了`Timber`缺省提供的`DebugTree`。其内部调用了`android.util.Log`，输出最详细的信息。这些信息只会输出到标准输出`STDOUT`，可以通过`adb logcat`查看。
- 在`Release`时，使用了自定义的`FileLogTree`，该类继承于`timber.log.Timber.Tree`。在这个类中根据日志的级别做不同处理。
  - 对于`VERBOSE`和`DEBUG`级别的日志，只调用`android.util.Log`输出到标准输出`STDOUT`，不会写入日志文件；
  - 对于其它级别的日志，同时输出到`STDOUT`和日志文件。

:::details 代码实现

```java
import android.app.Application;
import com.facebook.react.ReactApplication;
import timber.log.Timber;
import static timber.log.Timber.DebugTree;

public class MainApplication extends Application implements ReactApplication {
    @Override
    public void onCreate() {
        super.onCreate();
        if (BuildConfig.DEBUG) {
            Timber.plant(new DebugTree());
        } else {
            Timber.plant(new FileLogTree());
        }
    }
}
```

```java
import android.util.Log;
import androidx.annotation.NonNull;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import timber.log.Timber;

class FileLogTree extends Timber.Tree {
    static private Logger mLogger = LoggerFactory.getLogger("myLogger");

    @Override
    protected void log(int priority, String tag, @NonNull String message, Throwable t) {
        if (priority == Log.DEBUG || priority == Log.VERBOSE) {
            return;
        }

        String newMsg = tag + ": " + message;
        switch (priority) {
            case Log.INFO:
                Log.i(tag, message);
                mLogger.info(newMsg);
                break;
            case Log.WARN:
                Log.w(tag, message);
                mLogger.warn(newMsg);
                break;
            case Log.ERROR:
                Log.e(tag, message);
                mLogger.error(newMsg);
                break;
            default:
                break;
        }
    }
}
```

:::

#### 写入权限

在`MainApplication`（`<application android:name=".MainApplication" />`）的`onCreate`方法中，通过`Timber.plant`静态方法初始化日志。

由于初始化日志时，应用可能尚未得到`写存储`的用户许可，初始化有可能会失败。

因此在`MainActivity`的`onRequestPermissionsResult`（API文档请看[这里](https://developer.android.google.cn/reference/androidx/core/app/ActivityCompat.OnRequestPermissionsResultCallback?hl=en)）方法中，判断如果用户刚刚授予了写存储的许可，会再次初始化日志。

:::details 代码实现

```xml
<uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" />
<uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" />
```

```java
import android.os.Process;
import com.facebook.react.ReactActivity;

import ch.qos.logback.classic.LoggerContext;
import ch.qos.logback.classic.util.ContextInitializer;
import ch.qos.logback.core.joran.spi.JoranException;
import org.slf4j.LoggerFactory;

public class MainActivity extends ReactActivity {
    // 该Activity请求码。魔术数字，用来判断传过来的数据来自于哪个activity
    private static final int REQUEST_BASIC_PERM_CODE = 5005;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        if (Build.VERSION.SDK_INT >= 23) {
            requestNecessaryPerms();
        }
    }

    private List<String> filterPerms(String[] perms) {
        List<String> newPerms = new ArrayList<>(perms.length);
        for (String perm : perms) {
            if (this.checkSelfPermission(perm) == PackageManager.PERMISSION_DENIED) {
                newPerms.add(perm);
            }
        }
        return newPerms;
    }

    @RequiresApi(23)
    private void requestNecessaryPerms() {
        String[] perms = {
                permission.WRITE_EXTERNAL_STORAGE // 写入权限
        };
        List<String> newPerms = filterPerms(perms);
        if (!newPerms.isEmpty()) {
            // 该方法会触发onRequestPermissionsResult回调
            this.requestPermissions(newPerms.toArray(new String[0]), REQUEST_BASIC_PERM_CODE);
        }
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, @NonNull String[] permissions,
                                           @NonNull int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);

        // It is possible that the permissions request interaction
        // with the user is interrupted. In this case you will receive empty permissions
        // and results arrays which should be treated as a cancellation.
        if (requestCode == REQUEST_BASIC_PERM_CODE) {
            if (grantResults[0] == PackageManager.PERMISSION_DENIED) {
                // 权限拒绝，则AlertDialog提示并退出
                Process.killProcess(Process.myPid());
                System.exit(0);
            }
            if (permissions[0].equals(permission.WRITE_EXTERNAL_STORAGE)) {
                LoggerContext loggerContext = (LoggerContext) LoggerFactory.getILoggerFactory();
                loggerContext.reset();
                ContextInitializer ci = new ContextInitializer(loggerContext);
                try {
                    ci.autoConfig();
                } catch (JoranException ex) {
                    Timber.tag("MainActivity").e("Failed to re-initialize logger. %s", ex.getMessage());
                }
            }
        }
    }
}
```

:::

### 配置

`Timber`的日志通过一个`XML`文件进行配置。在`android/app/src/main/assets`目录下创建名为`logback.xml`的文件。在其中配置了如下信息：

- 日志位置为：`<sdcard>/AAA/BBB/CCC`。
- 日志滚动（`roll`）的条件是：每天滚动，如果一天结束前文件大小达到了10MB，也会滚动。
- 日志文件名为：`myApp_yyyyMMdd.log`。如果文件大小达到了10MB导致提前滚动，则文件名以`_0、_1`等结尾。
- 日志文件最多保留7天，超过7天自动删除旧日志文件。
- 日志文件最多占用50MB空间，超出则自动删除旧日志文件。
- 日志格式为：`%d{HH:mm:ss.SSS} [%thread] %-5level %msg%n`。
- 日志输出级别为`INFO`。

:::details 配置详情

```xml
<?xml version="1.0" encoding="utf-8"?>
<configuration debug="true">
    <property name="LOG_DIR" value="${EXT_DIR:-${DATA_DIR}}/AAA/BBB/CCC" />
    <timestamp datePattern="yyyyMMdd" key="today" />
    <!--<appender name="LOGCAT" class="ch.qos.logback.classic.android.LogcatAppender">-->
        <!--<encoder>-->
            <!--<pattern>%d{HH:mm:ss.SSS} [%thread] %-5level - %msg%n</pattern>-->
        <!--</encoder>-->
    <!--</appender>-->
    <appender name="ROLL_FILE" class="ch.qos.logback.core.rolling.RollingFileAppender">
        <file>${LOG_DIR}/myApp_${today}.log</file>
        <append>true</append>
        <lazy>true</lazy>
        <encoder>
            <pattern>%d{HH:mm:ss.SSS} [%thread] %-5level %msg%n</pattern>
        </encoder>
        <rollingPolicy class="ch.qos.logback.core.rolling.SizeAndTimeBasedRollingPolicy">
            <fileNamePattern>${LOG_DIR}/myApp_%d{yyyy-MM-dd}_%i.zip</fileNamePattern>
            <maxFileSize>10MB</maxFileSize>
            <maxHistory>7</maxHistory>
            <totalSizeCap>50MB</totalSizeCap>
        </rollingPolicy>
    </appender>
    <logger name="myLogger" level="INFO">
        <!--<appender-ref ref="LOGCAT" />-->
        <appender-ref ref="ROLL_FILE"/>
    </logger>
    <!--<root level="DEBUG">-->
        <!--<appender-ref ref="LOGCAT" />-->
    <!--</root>-->
</configuration>
```

:::

关于`logback.xml`文件的完整的配置格式信息，请看：[http://logback.qos.ch/manual/index.html](http://logback.qos.ch/manual/index.html)。

### 调用（Java）

在`Java`代码中，使用静态方法`Timber.tag(TAG).i(message, args)`输出`INFO`级别的日志，同理使用`v`、`d`、`w`、`e`方法输出对应级别的日志。其中`TAG`为输出日志的类名。然后对应的，封装供JS调用的输出日志的方法即可：`logVerbose`、`logDebug`、`logInfo`、`logWarn`、`logError`。

### 查看（Android）

- 在设备上打开`文件管理`应用，浏览到手机存储`/AAA/BBB/CCC`目录，直接点击查看各子目录中的日志文件。
- 将设备连到计算机，打开开发者模式，通过`adb logcat`查看。
- 将设备连到计算机，打开开发者模式，在`Android Studio`中点击菜单`View → Tool Windows → Device File Explorer`，在弹出的窗口中展开`sdcard`，进入`/AAA/BBB/CCC`，即可双击打开日志文件，也可点击右键获得更多选项。

## iOS

### 实现和配置

1. 为了保证日志按期望的格式输出，因此首先实现了`CustomFormatter`类。该类实现了[DDLogFormatter协议](https://cocoalumberjack.github.io/Protocols/DDLogFormatter.html#/c:objc(pl)DDLogFormatter(im)didAddToLogger:)。

    > 自定义格式接口请看[官网](https://cocoalumberjack.github.io/customformatters.html)。iOS日志中没有Android日志中TAG的概念，因此不包含所在类的信息，日志级别用单个大写字母表示。

2. 为了自定义日志文件路径及文件名（应用沙盒内），因此实现了`MyLogFileManager`类。此类继承了`DDLogFileManagerDefault`类（后者实现了[DDLogFileManager协议](https://cocoalumberjack.github.io/Protocols/DDLogFileManager.html)）并重写了它的两个方法。

    :::details 代码实现

    ``` objectivec
    // @interface MyLogFileManager : DDLogFileManagerDefault
    #import <Foundation/Foundation.h>
    #import "MyLogFileManager.h"

    @implementation MyLogFileManager

    // 设置文件名为 yyyy-MM-dd.log
    - (NSString *)newLogFileName
    {
        NSDateFormatter * dateFormatter = [[NSDateFormatter alloc] init];
        [dateFormatter setDateFormat:@"yyyy-MM-dd"];
        NSString * today = [dateFormatter stringFromDate:[NSDate date]];
        return [NSString stringWithFormat:@"%@.log", today];
    }

    - (BOOL)isLogFile:(NSString *)fileName
    {
        NSError *error = NULL;
        NSRegularExpression * regex = [NSRegularExpression
            regularExpressionWithPattern:@"^\\d{4}-\\d{2}-\\d{2}( \\d++)?+\\.log$"
            options:NSRegularExpressionCaseInsensitive error:&error];
        NSUInteger count = [regex numberOfMatchesInString:fileName options:NSMatchingAnchored
            range:NSMakeRange(0, fileName.length)];
        return count == 1;
    }

    @end
    ```

    :::

3. 在`AppDelegate.m`的`application:didFinishLaunchingWithOptions:`生命周期方法中，调用实例方法`initLogger`进行日志的初始化及配置。

    这里不使用缺省的日志保存位置（`~/Library/Caches/Logs`）。首先创建`DDLogFileManagerDefault`的实例，获取缺省日志保存目录，构造与其同级的`AAALogs`目录路径。然后创建自定义的`MyLogFileManager`的实例，并将新构造的目录路径传递给它。然后设置各个参数。最终配置为：

    - 日志位置为：`/var/mobile/Containers/Data/Application/<GUID>/Library/Caches/AAALogs`，其中`<GUID>`及前缀表示应用程序沙盒路径。
    - 日志滚动（roll）的条件是：每天滚动，如果一天结束前文件大小达到了10MB，也会滚动。注意：`CocoaLumberjack`缺省滚动日志文件不基于自然日。例如设置roll频率是24小时，如果第一个日志文件创建于15:00，则第二天的15:00会生成新的日志文件，导致每个日志文件记录的是前一天的15:00到第二天的15:00的日志。为实现每天0:00生成新的日志文件，将`rollingFrequency`设置为0以关闭自动滚动，同时实现了`applicationSignificantTimeChange`方法以在0点时触发滚动。
    - 日志文件名为：`yyyy-MM-dd.log`。如果文件大小达到了10MB导致提前滚动，则文件名以“ 1”、“ 2”等结尾。
    - 日志文件最多保留7天，超过7天自动删除旧日志文件。
    - 日志文件最多占用50MB空间，超出则自动删除旧日志文件。
    - 日志格式为：`HH:mm:ss.SSS level | message`（和`Java`格式相同）。

    :::details 代码实现

    ``` objectivec
    - (void)initLogger
    {
        // 准备获取iOS系统日志
        [DDLog addLogger:[DDOSLogger sharedInstance]];
        DDLogFileManagerDefault * defManager = [[DDLogFileManagerDefault alloc] init];
        // 获取并构造同级的自定义目录：~/Library/Caches/AAALogs
        NSString * defPath = defManager.logsDirectory;
        NSString * dir = [defPath.stringByDeletingLastPathComponent stringByAppendingPathComponent:@"AAALogs"];

        // 初始化日志文件夹
        MyLogFileManager * logFileManager = [[MyLogFileManager alloc] initWithLogsDirectory:dir];
        // initWithLogFileManager：进行初始化操作，且自定义配置
        _fileLogger = [[DDFileLogger alloc] initWithLogFileManager:logFileManager];
        // rollingFrequency 缺省值为 60 * 60 * 24（24小时），这里不自动roll file，以实现按自然日roll
        _fileLogger.rollingFrequency = 0;
        // maximumFileSize 缺省值为 1024 * 1024（1 MB）
        _fileLogger.maximumFileSize = 10 * 1024 * 1024;
        // 取消默认的在应用程序启动时，创建新的日志文件
        _fileLogger.doNotReuseLogFiles = NO;
        // 最多 7 个日志文件
        _fileLogger.logFileManager.maximumNumberOfLogFiles = 7;
        // 最多 50M
        _fileLogger.logFileManager.logFilesDiskQuota = 50 * 1024 * 1024;
        // 设置自定义格式
        _fileLogger.logFormatter = [[CustomFormatter alloc] init];

        [DDLog addLogger:_fileLogger withLevel:DDLogLevelDebug];
    }

    // 监听日期变更
    - (void)applicationSignificantTimeChange:(UIApplication *)application
    {
        [_fileLogger rollLogFileWithCompletionBlock:^{
        }];
    }
    ```

    :::

### 调用（OC）

在`Objective-C`代码中，使用静态方法`DDLogInfo(@"JS: %@", message);`输出`INFO`级别的日志，其中“JS”对应`Java`中的`TAG`。同理使用`DDLogVerbose`、`DDLogDebug`、`DDLogWarn`、`DDLogError`方法输出对应级别的日志。然后对应的，封装供JS调用的输出日志的方法即可：`logVerbose`、`logDebug`、`logInfo`、`logWarn`、`logError`。

### 查看（iOS）

- 将设备连到计算机，打开控制台查看日志。在控制台左边选中设备，在右上角的搜索框中按进程名进行过滤。
- 在`Xcode`中点击菜单`Window → Devices and Simulators`，在弹出的窗口中的`INSTALLED APPS`列表中选中该应用，点击下面的齿轮图标，在快捷菜单中点击`Download Container...`，然后指定保存位置。保存后打开`Finder`，找到保存的文件，右键点击并选择“显示包内容”，进入`AppData/Library/Caches/AAALogs`目录，即可看到日志文件。
