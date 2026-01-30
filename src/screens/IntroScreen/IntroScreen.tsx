import React, { useState } from 'react';
import { View, Text, Platform, StatusBar, Image, ImageBackground, StyleSheet, TouchableOpacity } from 'react-native';
import { heightPercentageToDP, widthPercentageToDP } from '../../constant/dimentions';
import { Colors } from '../../constant';

const IntroScreen = ({ navigation }) => {
    const [currentStep, setCurrentStep] = useState(0);

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
            setCurrentStep(currentStep + 1);
        } else {
         
            navigation.replace('BottomTabScreen')

        }
    };

    const currentSlide = slides[currentStep];

    return (
        <View style={{ flex: 1, top: Platform.OS === 'android' ? StatusBar.currentHeight : 0 }}>
            {/* Background Image */}
            <ImageBackground
                source={currentSlide.image}
                resizeMode="cover"
                style={{ width: widthPercentageToDP(100), height: heightPercentageToDP(100) }}
            />

            {/* Content Section */}
            <View style={{ position: 'absolute', bottom: 100, alignSelf: 'center', alignItems: 'center', gap: 10, paddingHorizontal: 20 }}>
                <Text style={styles.text}>{currentSlide.title}</Text>
                {currentSlide?.id ===2?<Text style={[styles.text, { fontSize: 22, fontWeight: 'bold' }]}>
                    
                    {currentSlide.subtitle}
                    <Text style={{ color: Colors.button[100] }}>{currentSlide.highlight} </Text>
                </Text>:<Text style={[styles.text, { fontSize: 22, fontWeight: 'bold' }]}>
                    <Text style={{ color: Colors.button[100] }}>{currentSlide.highlight} </Text>
                    {currentSlide.subtitle}
                </Text>}
                <Text style={[styles.text, { fontSize: 14 }]}>{currentSlide.description}</Text>

                {/* Bottom Row (Stepper + Arrow Button) */}
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', width: widthPercentageToDP(90), alignItems: 'center' }}>
                    <StepIndicator totalSteps={slides.length} currentStep={currentStep} />

                    <TouchableOpacity
                        style={{ width: 50, borderRadius: 25, height: 50, justifyContent: 'center', backgroundColor: Colors.button[100] }}
                        onPress={handleNext}
                    >
                        <Image style={{ width: 30, height: 30, alignSelf: 'center' }} source={require('../../assets/Png/right-up.png')} />
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
