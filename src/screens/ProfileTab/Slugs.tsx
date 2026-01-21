import { View, Text, StyleSheet, ScrollView, useWindowDimensions, TouchableOpacity, Image, StatusBar } from 'react-native'
import React, { useEffect, useState } from 'react';
import { UserService } from '../../service/ApiService';
import Toast from 'react-native-toast-message';
import { CommonLoader } from '../../components/CommonLoader/commonLoader';
import RenderHTML from 'react-native-render-html';
import { SafeAreaView } from 'react-native-safe-area-context';


const Slugs = ({ navigation, route }) => {
    const { showLoader, hideLoader } = CommonLoader();
    const { width } = useWindowDimensions();
    const name = route.params.slug;
    const [html, sethtml] = useState(null)


    useEffect(() => {
        console.log("params", name)
        Slug();
    }, [name])

    const Slug = async () => {
        try {
            showLoader();
            const res = await UserService.SlugAPI(name);
            const Getslugs = res?.data?.data?.content || {};
            sethtml(Getslugs);
            console.log("slugs", Getslugs)

        } catch (e) {
            hideLoader();
            const error = e as any;
            if (error.status === 401) {
                console.log('Unauthorized access - perhaps token expired');
            }
            else {
                Toast.show({ type: 'error', text1: 'Failed to load slugs' });
            }
        } finally {
            hideLoader();
        }
    };


    return (
        <SafeAreaView style={{flex:1,backgroundColor:'#fff'}}>
            <ScrollView style={styles.container} contentContainerStyle={{ padding: 16 }}>
                <View style={{
                    backgroundColor: '#FFF',
                    justifyContent: 'space-between', flexDirection: 'row', alignItems: 'center',
                }}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton} >
                        <Image source={require('../../assets/Png/back.png')} style={{ width: 20, height: 20 }} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>{name}</Text>
                    <View></View>
                </View>

                <View style={{ marginTop: 20 }}>
                    <RenderHTML
                        contentWidth={width - 32} // account for padding
                        source={{ html }}
                        enableExperimentalMarginCollapsing={true}
                        tagsStyles={{
                            p: { marginBottom: 12, lineHeight: 20, color: '#222', fontSize: 14 },
                            strong: { fontWeight: '700' },
                            a: { color: '#1e88e5' },
                        }}
                        defaultTextProps={{ selectable: true }} // allow text selection/copy
                    />
                </View>
            </ScrollView>
        </SafeAreaView>
    )
}

export default Slugs;

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#fff', marginTop: StatusBar.currentHeight },

    headerTitle: { fontSize: 18, fontWeight: '600' },
    backButton: {
        width: 36,
        height: 36,
        alignItems: 'center',
        justifyContent: 'center',
    },
})