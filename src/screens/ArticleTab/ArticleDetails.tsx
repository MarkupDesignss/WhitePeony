import React, { useEffect } from 'react'
import {
  StyleSheet,
  Text,
  View,
  Image,
  ScrollView,
  TouchableOpacity,
  Share,
  Platform,
  ImageURISource,
  NativeModules,
  StatusBar,
} from 'react-native'
import { CommonLoader } from '../../components/CommonLoader/commonLoader';
import { Image_url, UserService } from '../../service/ApiService';
import { HttpStatusCode } from 'axios';
import Toast from 'react-native-toast-message';
import { formatDate } from '../../helpers/helpers';
import { Colors, Images } from '../../constant';

const getTimeAgo = (dateString?: string) => {
  if (!dateString) return '';
  const then = new Date(dateString).getTime();
  const now = Date.now();
  const diffSec = Math.max(0, Math.floor((now - then) / 1000));

  if (diffSec < 60) return 'Just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin} ${diffMin === 1 ? 'minute' : 'minutes'} ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr} ${diffHr === 1 ? 'Hour' : 'Hours'} Ago`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 30) return `${diffDay} ${diffDay === 1 ? 'day' : 'days'} ago`;
  const diffMon = Math.floor(diffDay / 30);
  if (diffMon < 12) return `${diffMon} ${diffMon === 1 ? 'month' : 'months'} ago`;
  const diffYr = Math.floor(diffMon / 12);
  return `${diffYr} ${diffYr === 1 ? 'year' : 'years'} ago`;
};

const ArticleDetails = ({ navigation, route }: any) => {
  const airtcleid = route?.params?.article || '';

  const { showLoader, hideLoader } = CommonLoader();
  type ArticleDetail = {
    image?: string;
    title?: string;
    updated_at?: string;
    views?: number;
    content?: string;
  };
  const [airtcleDetails, setairtcleDetails] = React.useState<ArticleDetail | null>(null);


  // We'll share the header image asset directly to avoid native capture libraries.
  const onCaptureAndShare = async () => {
    try {
      // Resolve the bundled asset to a URI that the Share API can use.
      const img = require('../../../src/assets/Png/tea.jpg') as ImageURISource
      // On iOS the require returns a number; resolveAssetSource converts it to a uri.
      // If resolveAssetSource is not available through NativeModules, Share may still accept the asset.
      // We'll attempt to use Image.resolveAssetSource if present.
      // @ts-ignore - resolveAssetSource may not have perfect types here
      const resolved = (Image as any).resolveAssetSource ? (Image as any).resolveAssetSource(img) : img
      const uri = resolved?.uri || img

      await Share.share(
        {
          url: uri,
          title: 'Article Image',
          message: Platform.OS === 'android' ? 'Sharing article image' : undefined,
        },
        { dialogTitle: 'Share article image' }
      )
    } catch (err) {
      console.warn('share error', err)
    }
  }

  useEffect(() => {
    ArticleDetail(airtcleid)
  }, [])

  const ArticleDetail = async (id: string) => {
    try {
      showLoader();
      const res = await UserService.articleDetail(id);
      hideLoader();

      if (res?.status === HttpStatusCode.Ok && res?.data) {
        const { message, data } = res.data;
        console.log("EventList response data:", res.data);
        setairtcleDetails(data || null)
      } else {
        Toast.show({
          type: "error",
          text1: res?.data?.message || "Something went wrong!",
        });
      }
    } catch (err: any) {
      hideLoader();
      console.log("Error in EventList:", JSON.stringify(err));
      Toast.show({
        type: "error",
        text1: err?.response?.data?.message || "Something went wrong! Please try again.",
      });
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Image
          source={{ uri: Image_url + airtcleDetails?.image }}
          style={styles.headerImage}
          resizeMode="cover"
        />
        <View style={styles.headerOverlay} >
          <Text style={{ color: '#ffffff', fontSize: 14, fontWeight: '700', textAlign: 'center', width: '70%' }}>{airtcleDetails?.title}</Text>
        </View>
        <TouchableOpacity style={[styles.backBtn, { left: 18 }]} onPress={() => navigation.goBack()}>
          <Image source={require('../../assets/Png/back.png')} style={{ width: 20, height: 20, tintColor: '#fff' }} />
        </TouchableOpacity>
        <View style={{ right: 10, position: 'absolute', top: 18, backgroundColor: Colors.button[100], width: 30, height: 30, borderRadius: 15, justifyContent:'center' }}>
          <Image source={require('../../assets/Png/bookmark.png')} style={{ width: 20, height: 20, tintColor: '#000', alignSelf: "center" }} />
        </View>

        <View style={styles.titleWrap}>
          <Text style={styles.title}>{airtcleDetails?.title}</Text>
        </View>
        <ScrollView contentContainerStyle={styles.scroll}>
          <View style={styles.metaRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={{ width: 10, height: 10, backgroundColor: Colors.button[100], borderRadius: 5, }}></View>
              <Text style={styles.metaText}>{getTimeAgo(airtcleDetails?.created_at)}</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Image source={Images.date} style={{ width: 15, height: 15, }} />
              <Text style={styles.metaText}>{formatDate(airtcleDetails?.created_at)?.slice(0, -9)}</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Image source={Images.views} style={{ width: 15, height: 15, }} />

              <Text style={styles.metaText}>{airtcleDetails?.views} views</Text>
            </View>
          </View>

          <View style={styles.body}>
            <Text style={styles.lead}>
              {airtcleDetails?.title}
            </Text>

            <Text style={styles.paragraph}>
              {airtcleDetails?.content}
            </Text>


          </View>
        </ScrollView>
      </View>



    </View>
  )
}

export default ArticleDetails

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', marginTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0, },
  scroll: { paddingBottom: 120 },
  card: { borderRadius: 16, overflow: 'hidden', backgroundColor: '#fff' },
  headerImage: { width: '100%', height: 378, borderBottomLeftRadius: 20, borderBottomRightRadius: 20 },
  headerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 378,
    backgroundColor: 'rgba(0,0,0,0.25)',
    borderBottomLeftRadius: 20, borderBottomRightRadius: 20,
    justifyContent: 'center', alignItems: 'center'
  },
  backBtn: { position: 'absolute', top: 18, },
  titleWrap: { position: 'absolute', left: 20, right: 20, bottom: 20 },
  title: { color: '#fff', fontSize: 20, fontWeight: '600', textAlign: 'center' },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', padding: 14, paddingTop: 18 },
  metaText: { color: '#999', fontSize: 12, marginLeft: 7 },
  body: { paddingHorizontal: 12, paddingBottom: 20 },
  lead: { fontSize: 16, fontWeight: '700', marginBottom: 8 },
  paragraph: { fontSize: 14, color: '#333', lineHeight: 20, marginBottom: 10 },
  paragraphSmall: { fontSize: 13, color: '#333', marginBottom: 6 },
  blockquote: { borderLeftWidth: 3, borderLeftColor: '#e0e0e0', paddingLeft: 10, marginVertical: 8, backgroundColor: '#fafafa', padding: 10, borderRadius: 6 },
  blockquoteText: { color: '#999', fontStyle: 'italic' },
  subhead: { fontSize: 15, fontWeight: '600', marginTop: 10, marginBottom: 6 },
  fab: {
    position: 'absolute',
    right: 18,
    bottom: 28,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#2e7d32',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 6,
  },
})