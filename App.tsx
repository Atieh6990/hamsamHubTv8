import React, {useState, useEffect, useRef} from 'react';
import {StyleSheet, View, BackHandler, Linking} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {WebView, WebViewMessageEvent, WebView as WebViewType} from 'react-native-webview';
import {NetworkInfo} from 'react-native-network-info';
import DeviceInfo from 'react-native-device-info';
import Spinner from 'react-native-loading-spinner-overlay';
import SendIntentAndroid from 'react-native-send-intent';
import Video, {VideoRef} from 'react-native-video';

function App(): React.JSX.Element {
    const webViewRef = useRef<WebViewType | null>(null);
    const videoRef = useRef<VideoRef>(null);
    const [wifiMacAddress, setWifiMacAddress] = useState<string>('');
    const [lanMacAddress, setLanMacAddress] = useState<string>('');
    const [packageName, setPackageName] = useState<string>('');
    const [buildNumber, setBuildNumber] = useState<string>('');
    const [androidId, setAndroidId] = useState<string>('');
    const [androidVersion, setAndroidVersion] = useState<string>('');
    const [spinner, setSpinner] = useState(true);
    const [playerUrl, setPlayerUrl] = useState<string>('');
    const [videoShow, setVideoShow] = useState<boolean>(false);
    const [posterUrl, setPosterUrl] = useState<string>('');
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    let [isInstalled, setIsInstalled] = useState<boolean>(false);
    const sambazarUrl = 'sambazar://openDet/';
    const samBazarPkgName = 'com.sambazar';

    useEffect(() => {
        const backHandler = BackHandler.addEventListener('hardwareBackPress', handleBackPress);
        fetchMacAddresses().then(r => {
        });
        return () => {
            backHandler.remove();
        };
    }, [videoShow]);

    const fetchMacAddresses = async () => {
        try {
            setPackageName(DeviceInfo.getBundleId());
            setBuildNumber(DeviceInfo.getBuildNumber());
            setAndroidVersion(DeviceInfo.getSystemVersion());
            setAndroidId(await DeviceInfo.getUniqueId());
            const bssid = await NetworkInfo.getBSSID();
            setWifiMacAddress(bssid || '');
            const mac = await DeviceInfo.getMacAddress();
            setLanMacAddress(mac || '');
            // console.log(wifiMacAddress, lanMacAddress, buildNumber, androidId, androidVersion)
        } catch (error) {
            console.error('Error fetching MAC addresses:', error);
        }
    };

    const getData = async () => {
        try {
            const value = await AsyncStorage.getItem('hamsamTk');
            sendMessageToWebView('userData', value);
        } catch (e) {
            console.error('Error getting data from AsyncStorage:', e);
            sendMessageToWebView('userData', null);
        }
    };

    const removeData = async () => {
        try {
            await AsyncStorage.removeItem('hamsamTk');
            sendMessageToWebView('removedData', true);
        } catch (e) {
            console.error('Error removing data from AsyncStorage:', e);
            sendMessageToWebView('removedData', false);
        }
    };

    const setData = async (data: any) => {
        try {
            await AsyncStorage.setItem('hamsamTk', data);
            sendMessageToWebView('setData', true);
        } catch (e) {
            console.error('Error setting data to AsyncStorage:', e);
            sendMessageToWebView('setData', false);
        }
    };

    const handleBackPress = () => {
        
        if (videoShow) {
            stopVideo();
        }
        if (webViewRef.current) {
            sendMessageToWebView('returnPage', '');
        }
        return true; // جلوگیری از رفتار پیش‌فرض
    };

    const checkAppInstallation = (packageData: any) => {
        try {
            SendIntentAndroid.isAppInstalled(packageData.packageName)
                .then((installed: boolean) => {
                    setIsInstalled(installed);
                    manageOpenApp(packageData);
                })
        } catch (error) {
            setIsInstalled(false);
        }
        // try {
        //     const data = await InstalledApps.getSortedApps({includeVersion: true, includeAccentColor: true});
        //     isInstalled = data.some((app) => app.packageName === packageData.packageName);
        //     // console.log(isInstalled)
        //     setIsInstalled(isInstalled);
        //     openApp(packageData);
        // } catch (error) {
        //     setIsInstalled(false);
        // }
    };
    const manageOpenApp = (packageData: any) => {
        const name = packageData.packageName
        if (isInstalled) {
            SendIntentAndroid.openApp(name,{}).then(()=>{
                // console.log(`${name} opened successfully`);
            })
            // SendIntentAndroid.openApp(name)
            //     .then(() => {
            //         console.log(`${packageName} opened successfully`);
            //     })
        } else {
            openPageOnApp(sambazarUrl + 'verr=' + packageData.packageVersion + '&package=' + packageData.packageName + '');
        }
        // if (isInstalled) {
        //     RNLauncherKitHelper.launchApplication(packageData.packageName);
        // } else {
        //     openPageOnApp(sambazarUrl + 'ver=' + packageData.packageVersion + '&package=' + packageData.packageName + '');
        // }
    };
    const openPageOnApp = async (url: string) => {
        // url = 'filimo://movie?id=152555'
        // url = 'namava://www.namava.ir/series/249502-کنت_مونت_کریستو'
        // url = 'tvrecommendation://app/GapFilmTV/gf_tv_id_40202/24130/'
        // url = 'app://tmk.ir/series/103586'
        // url = 'app://tmk.ir/movies/10076036'
        const supported = await Linking.canOpenURL(url);
        // console.log('supported', supported, 'url', url);
        if (supported) {
            await Linking.openURL(url);
            // console.log('open : ' + JSON.stringify(supported));
        } else {
            await SendIntentAndroid.openApp(samBazarPkgName,{}).then(()=>{
                // console.log(`${samBazarPkgName} opened successfully`);
            })
            // await RNLauncherKitHelper.launchApplication(samBazarPkgName);
            // console.log('Don\'t know how to open this URL');
        }
    };
    const sendMessageToWebView = (type: string, data: any) => {
        const params = {type, data};
        const param = JSON.stringify(params);
        if (webViewRef.current) {
            try {
                webViewRef.current.injectJavaScript(`window.app1.$emit("PostMessages", ${param})`);
            } catch (error) {
                console.error('Error injecting JavaScript:', error);
            }
        } else {
            console.error('webViewRef is not set');
        }
    };

    const handleOnMessage = (event: WebViewMessageEvent) => {
        const {type, data} = JSON.parse(event.nativeEvent.data);
        // console.log(type, data);
        switch (type) {
            case 'getData':
                getData();
                break;
            case 'removeData':
                removeData();
                break;
            case 'setData':
                setData(data);
                break;
            case 'exit':
                BackHandler.exitApp();
                break;
            case 'openApp':
                checkAppInstallation(data);
                break;
            case 'openPageOnApp':
                openPageOnApp(data);
                break;
            case 'showVideo':
                prepareVideo(data);
                break;
            case 'handleVideoActions':
                videoActions(data);
                break;
        }
    };

    const videoActions = (data: any) => {
        switch (data.action) {
            case 'togglePlayPause':
                togglePlayPause();
                break;
            case 'seek':
                seekVideo(data.value);
                break;
        }
    };
    const prepareVideo = (data: any) => {
        console.log(data)
        setPosterUrl(data.poster);
        playVideo(data);

    };

    const playVideo = (data: any) => {
        setPlayerUrl(data.link);
        setVideoShow(true);
    };

    const stopVideo = () => {
        setCurrentTime(0);
        setDuration(0);
        setPlayerUrl('');
        setPosterUrl('');
        setIsPlaying(false);
        setVideoShow(false);
    };
    const togglePlayPause = () => {
        setIsPlaying(!isPlaying);
    };
    const seekVideo = (time: any) => {
        if (videoRef.current) {
            const newTime = currentTime + time;
            console.log(newTime)
            // اطمینان از اینکه newTime در محدوده درست است
            if (newTime >= 0 && newTime <= duration) {
                videoRef.current.seek(newTime);
            } else if (newTime < 0) {
                videoRef.current.seek(0); // اگر زمان منفی باشد، به ابتدای ویدیو برگرد
            } else {
                videoRef.current.seek(duration); // اگر زمان بیشتر از مدت ویدیو باشد، به انتهای ویدیو برگرد
            }
        }
    };
    const onBuffer = () => {
        console.log('onBuffer');
    };
    const videoError = () => {
        console.log('videoError');
    };
    const onProgress = (data: any) => {
        setCurrentTime(data.currentTime);
    };
    const onLoad = (data: any) => {
        // console.log(data)
        setDuration(data.duration); // دریافت مدت زمان ویدیو
    };

    const renderWebview = () => {
        console.log(lanMacAddress);
        if (lanMacAddress === '') {
            return null; // به جای <></> از null استفاده می‌کنیم
        }
        return (
            // <View style={styles.container}>
            <WebView
                source={{
                    // uri: 'https://www.varzesh3.com/',
                    uri: `file:///android_asset/webview/index.html?wifiMacAddress=${wifiMacAddress}&lanMacAddress=${lanMacAddress}&packageName=${packageName}&model=${buildNumber}&androidId=${androidId}&androidVersion=${androidVersion}`,
                }}
                ref={webViewRef}
                onMessage={handleOnMessage}
                onLoadEnd={() => setSpinner(false)}
                originWhitelist={['*']}
                allowFileAccess={true}
                allowUniversalAccessFromFileURLs={true}
                mediaPlaybackRequiresUserAction={false}
                keyboardDisplayRequiresUserAction={false}
                domStorageEnabled={true}
                javaScriptEnabled={true}
                sharedCookiesEnabled={true}
            />
            // </View>
        );
    };


    const renderVideo = () => {
        if (!videoShow) {
            return null;
        }

        return (
            <Video
                paused={isPlaying}
                resizeMode="cover"
                source={{uri: playerUrl}} // Can be a URL or a local file.
                ref={videoRef}
                onBuffer={onBuffer} // Callback when remote video is buffering
                onError={videoError} // Callback when video cannot be loaded
                poster={posterUrl}
                repeat={true}
                controls={true}
                onProgress={onProgress}
                onLoad={onLoad}
                style={styles.videoStyle}
            />
        );
    };

    return (
        <View style={{flex: 1}}>

            {/*<View style={{width:200 , height:200 , backgroundColor:'red'}} />*/}
            <Spinner visible={spinner} animation={'fade'} size={'large'}/>
            {/*{!videoShow ? renderWebview() : renderVideo()}*/}
            {renderWebview()}
            {renderVideo()}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        // flex: 1,
    },
    backgroundStyle: {
        backgroundColor: 'gray'
    },
    videoStyle: {
        position: 'absolute',
        top: 0,
        flex: 1,
        width: '100%',
        height: '100%',
        zIndex: 10,
    },
});

export default App;
