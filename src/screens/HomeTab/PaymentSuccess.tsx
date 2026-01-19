import React, { useEffect, useRef, useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  Share,
  ActivityIndicator,
} from 'react-native';
import { CommonLoader } from '../../components/CommonLoader/commonLoader';
import { Colors } from '../../constant';


const PaymentSuccess = ({ navigation }: any) => {
    const { showLoader, hideLoader } = CommonLoader();
  
  const [processing, setProcessing] = useState(false)

  const ref = useRef<any>(null)
  const cardRef = useRef<any>(null)

  useEffect(() => {
    setTimeout(() => {
      navigation.goBack();
    }, 2000);
  }, [])

  const onDownload = async () => {
    showLoader();
    try {
      let viewShotModule: any = null
      try {
        viewShotModule = await import('react-native-view-shot')
      } catch (e) {
        viewShotModule = null
      }

      if (viewShotModule && ref.current) {
        const { captureRef } = viewShotModule
        const uri = await captureRef(ref.current, { format: 'png', quality: 0.95 })
        await Share.share({ url: uri, title: 'Your Workshop Registration' })
      } else {
        const img = require('../../assets/Png/product.png')
        // @ts-ignore
        const resolved = (Image as any).resolveAssetSource ? (Image as any).resolveAssetSource(img) : img
        const uri = resolved?.uri || img
        await Share.share({ url: uri, title: 'Your Workshop Registration' })
      }
    } catch (err) {
      console.warn('download error', err)
    } finally {
      showLoader();
    }
  }


  return (
    <View style={styles.page} ref={ref} collapsable={false}>
      <View style={styles.mediaWrap}>
        <React.Suspense fallback={<Image source={require('../../assets/Png/cookies.png')} style={styles.media} />}>
          {/* dynamic import of react-native-video to play local mp4 if available */}
          {React.createElement(() => {
            try {
              const Video = require('react-native-video').default
              return (
                <Video
                  source={require('../../assets/Png/Check.mp4')}
                  style={styles.media}
                  repeat
                  paused={false}
                  resizeMode="contain"
                />
              )
            } catch (e) {
              return <Image source={require('../../assets/Png/cookies.png')} style={styles.media} />
            }
          })}
        </React.Suspense>
      </View>

      <Text style={styles.heading}>Your Order Has Been Accepted</Text>
      <Text style={styles.sub}>Your items has been placed successfully. Your Order Id:#20356890</Text>
      <TouchableOpacity style={styles.downloadBtn} onPress={onDownload} disabled={processing}>
        {processing ? <ActivityIndicator color="#222" /> : <Text style={styles.downloadText}>Track Order</Text>}
      </TouchableOpacity>

      <TouchableOpacity style={styles.back} onPress={() => navigation.navigate('BottomTabScreen', { screen: 'HomeScreen' })}>
        <Text>← Continue Shopping</Text>
      </TouchableOpacity>
    </View>
  )
}

export default PaymentSuccess;

const styles = StyleSheet.create({
  page: { flex: 1, padding: 24, backgroundColor: '#fff', alignItems: 'center' },
  mediaWrap: { marginTop: '60%', marginBottom: 12, alignItems: 'center', },
  media: { width: 209, height: 144, borderRadius: 8 },
  heading: { fontSize: 22, fontWeight: '700', textAlign: 'center', marginTop: 10 },
  sub: { color: '#9aa0a0', textAlign: 'center', marginVertical: 16 },
  card: { borderWidth: 1, borderColor: '#AEB254', borderRadius: 10, marginTop: 12 },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  label: { color: '#666', width: '45%', paddingVertical: 4, paddingHorizontal: 10 },
  value: { color: '#222', width: '50%', textAlign: 'right', paddingVertical: 4, paddingHorizontal: 10 },
  downloadBtn: { marginTop: 20, backgroundColor: Colors.button[100], paddingVertical: 14, width: '100%', borderRadius: 24, alignItems: 'center' },
  downloadText: { color: '#222', fontWeight: '600' },
  smallDownloadBtn: { marginTop: 12, backgroundColor: '#fff', paddingVertical: 10, width: '100%', borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: '#ddd' },
  smallDownloadText: { color: '#222' },
  back: { marginTop: 18 },
})
