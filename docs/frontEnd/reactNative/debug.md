# 调试

## 真机调试

远程调试：

- **在iOS上**

打开"RCTWebSocketExecutor.m"文件, 将"localhost"改为自己的电脑ip, 然后Development Menu下单击"Debug JS Remotely"启动JS远程调试功能.

- **在Android上**

方式一:
在Android5.0以上设备, 将手机通过usb连接电脑, 然后通过adb命令行工具运行如下命令来设置端口转发.

```bash
adb reverse tcp:8081 tcp:8081
```

方式二:
也可以通过"Developer Menu"下的"Dev Settings"中设置你的电脑ip来进行调试.

> 使用真机调试时, 需要确保手机和电脑处在同一个网段内.