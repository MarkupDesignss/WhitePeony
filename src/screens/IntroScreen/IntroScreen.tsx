import React, { useState, useRef } from 'react';
import {
    View,
    Text,
    Platform,
    StatusBar,
    Image,
    ImageBackground,
    StyleSheet,
    TouchableOpacity,
    FlatList,
    Dimensions,
} from 'react-native';
import {
    heightPercentageToDP,
    widthPercentageToDP,
} from '../../constant/dimentions';
import { Colors } from '../../constant';
import TransletText from '../../components/TransletText';

const { width } = Dimensions.get('window');

const IntroScreen = ({ navigation }) => {
    const [currentStep, setCurrentStep] = useState(0);
    const flatListRef = useRef(null);

    // Slides data (image + text)
    const slides = [
        {
            id: 0,
            image: require('../../assets/Intro/pouring.png'),
            title: 'Pure Flavours, Delivered Worldwide',
            subtitle: 'To White Peony',
            highlight: 'Welcome',
            description:
                'Explore Our Hand Picked Organic Teas And Elegant Tea Ware Shipped Directly To Your Door, Wherever You Are.',
        },
        {
            id: 1,
            image: require('../../assets/Intro/japanese-ice.png'),
            title: 'Elegant Tea Gifts & Accessories',
            subtitle: '& Ceremonies Made Special',
            highlight: 'Gifts',
            description:
                'From Beautiful Tea Sets To Curated Gift Bundles, Find Something Meaningful For Tea Lovers Or Elevate Your Own Tea Ritual.',
        },
        {
            id: 2,
            image: require('../../assets/Intro/glass-tea.png'),
            title: 'Taste Purity And Freshness With Every Cup',
            subtitle: 'Discover The Essence Of ',
            highlight: 'Organic Tea',
            description:
                'From Beautiful Tea Sets To Curated Gift Bundles, Find Something Meaningful For Tea Lovers Or Elevate Your Own Tea Ritual.',
        },
    ];

    const StepIndicator = ({ totalSteps = 3, currentStep = 0 }: any) => {
        return (
            <View style={styles.container}>
                <View style={styles.dotsContainer}>
                    {Array.from({ length: totalSteps }).map((_, index) => {
                        const isActive = index === currentStep;
                        return (
                            <View
                                key={index}
                                style={[
                                    styles.dot,
                                    isActive ? styles.activeDot : styles.inactiveDot,
                                ]}
                            />
                        );
                    })}
                </View>
            </View>
        );
    };

    const handleNext = () => {
        if (currentStep < slides.length - 1) {
            const nextStep = currentStep + 1;
            setCurrentStep(nextStep);
            flatListRef.current?.scrollToIndex({ 
                index: nextStep, 
                animated: true 
            });
        } else {
            console.log('Intro Finished 🚀');
            // 👉 Navigate to home or login here
            navigation.replace('BottomTabScreen');
        }
    };

    const handleScroll = (event) => {
        const scrollPosition = event.nativeEvent.contentOffset.x;
        const index = Math.round(scrollPosition / width);
        setCurrentStep(index);
    };

    const renderItem = ({ item }) => {
        return (
            <View style={{ width }}>
                {/* Background Image */}
                <ImageBackground
                    source={item.image}
                    resizeMode="cover"
                    style={{
                        width: widthPercentageToDP(100),
                        height: heightPercentageToDP(100),
                    }}
                />
            </View>
        );
    };

    const currentSlide = slides[currentStep];

    return (
        <View
            style={{
                flex: 1,
                top: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
            }}
        >
            {/* Swipeable FlatList for Images */}
            <FlatList
                ref={flatListRef}
                data={slides}
                renderItem={renderItem}
                keyExtractor={(item) => item.id.toString()}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                onScroll={handleScroll}
                scrollEventThrottle={16}
                bounces={false}
                style={{ flex: 1 }}
            />

            {/* Content Section */}
            <View
                style={{
                    position: 'absolute',
                    bottom: 100,
                    alignSelf: 'center',
                    alignItems: 'center',
                    gap: 10,
                    paddingHorizontal: 20,
                }}
            >
                <TransletText style={styles.text} text={currentSlide.title} />

                {currentSlide?.id === 2 ? (
                    <View style={{ alignItems: 'center' }}>
                        <TransletText
                            style={[styles.text, { fontSize: 22, fontWeight: 'bold' }]}
                            text={currentSlide.subtitle}
                        />
                        <TransletText
                            style={[styles.text, { fontSize: 22, fontWeight: 'bold', color: Colors.button[100] }]}
                            text={currentSlide.highlight}
                        />
                    </View>
                ) : (
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap' }}>
                        <TransletText
                            style={[styles.text, { fontSize: 22, fontWeight: 'bold', color: Colors.button[100] }]}
                            text={currentSlide.highlight + ' '}
                        />
                        <TransletText
                            style={[styles.text, { fontSize: 22, fontWeight: 'bold' }]}
                            text={currentSlide.subtitle}
                        />
                    </View>
                )}

                <TransletText
                    style={[styles.text, { fontSize: 14 }]}
                    text={currentSlide.description}
                />

                {/* Bottom Row (Stepper + Arrow Button) */}
                <View
                    style={{
                        flexDirection: 'row',
                        justifyContent: 'space-between',
                        width: widthPercentageToDP(90),
                        alignItems: 'center',
                    }}
                >
                    <StepIndicator totalSteps={slides.length} currentStep={currentStep} />

                    <TouchableOpacity
                        style={{
                            width: 50,
                            borderRadius: 25,
                            height: 50,
                            justifyContent: 'center',
                            backgroundColor: Colors.button[100],
                        }}
                        onPress={handleNext}
                    >
                        <Image
                            style={{ width: 30, height: 30, alignSelf: 'center' }}
                            source={require('../../assets/Png/right-up.png')}
                        />
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );
};

export default IntroScreen;

const styles = StyleSheet.create({
    text: {
        fontSize: 12,
        color: '#fff',
        textAlign: 'center',
    },
    container: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 16,
    },
    dotsContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    dot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    activeDot: {
        backgroundColor: '#E6F26C',
        width: 30,
        borderRadius: 10,
    },
    inactiveDot: {
        backgroundColor: '#E6F26C',
        opacity: 0.5,
    },
});