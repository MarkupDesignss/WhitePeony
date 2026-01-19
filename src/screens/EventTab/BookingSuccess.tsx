import React, { useRef, useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  Share,
  ActivityIndicator,
} from 'react-native'
import LinearGradient from 'react-native-linear-gradient';
import { CommonLoader } from '../../components/CommonLoader/commonLoader';
import { Colors } from '../../constant';
const BookingSuccess = ({ navigation }: any) => {
  const ref = useRef<any>(null)
  const cardRef = useRef<any>(null)
  const { showLoader, hideLoader } = CommonLoader();


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
      hideLoader();
    }
  }

  const onDownloadCard = async () => {
    showLoader();
    try {
      let viewShotModule: any = null
      try {
        viewShotModule = await import('react-native-view-shot')
      } catch (e) {
        viewShotModule = null
      }

      if (viewShotModule && cardRef.current) {
        const { captureRef } = viewShotModule
        const uri = await captureRef(cardRef.current, { format: 'png', quality: 0.95 })
        await Share.share({ url: uri, title: 'Booking Card' })
      } else {
        const img = require('../../assets/Png/product.png')
        // @ts-ignore
        const resolved = (Image as any).resolveAssetSource ? (Image as any).resolveAssetSource(img) : img
        const uri = resolved?.uri || img
        await Share.share({ url: uri, title: 'Booking Card' })
      }
    } catch (err) {
      console.warn('download card error', err)
    } finally {
      hideLoader();
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

      <Text style={styles.heading}>Your Workshop Has{`\n`}Been Registered!</Text>
      <Text style={styles.sub}>A seat has reserved successfully. You have complete registration!</Text>

      <LinearGradient ref={cardRef} style={styles.card} colors={[Colors.button[100], '#FFFFFF']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
        <View style={styles.row}><Text style={styles.label}>Event Name</Text><Text style={styles.value}>Tea Tasting Masterclass</Text></View>
        <View style={styles.row}><Text style={styles.label}>Event Date</Text><Text style={styles.value}>Sep 23,2025</Text></View>
        <View style={styles.row}><Text style={styles.label}>Event Time</Text><Text style={styles.value}>08:00 - 10:00 PM</Text></View>
        <View style={styles.row}><Text style={styles.label}>Number of seats</Text><Text style={styles.value}>02</Text></View>
        <View style={styles.row}><Text style={styles.label}>Event Address</Text><Text style={styles.value}>Poděbradská 634/98, Hloubětín{`\n`}19800 Praha 9</Text></View>
      </LinearGradient>



      <TouchableOpacity style={styles.downloadBtn} onPress={onDownload} >
        <Text style={styles.downloadText}>Download E-Workshop</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.back} onPress={() => navigation.navigate('BottomTabScreen', { screen: 'Events' })}>
        <Text>← Back To Event</Text>
      </TouchableOpacity>
    </View>
  )
}

export default BookingSuccess

const styles = StyleSheet.create({
  page: { flex: 1, padding: 24, backgroundColor: '#fff', alignItems: 'center' },
  mediaWrap: { marginTop: '20%', marginBottom: 12, alignItems: 'center', },
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
