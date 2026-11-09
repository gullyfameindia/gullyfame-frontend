import { useEffect, useRef, useState } from "react";
import {
  ScrollView,
  Image,
  View,
  Text,
  NativeSyntheticEvent,
  NativeScrollEvent,
  Dimensions,
} from "react-native";
import { styles } from "./styles";
import { wp } from "@/utils/responsive";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { TALENT_CATEGORIES } from "@/constants/talentCategories";

const HERO_IMAGE = require("@assets/images/carousel1.png");
/** The hero always shows the talent categories; admin-panel banners are not used here. */
const slides = TALENT_CATEGORIES.map((c, i) => ({ id: i + 1, ...c }));
type Slide = (typeof slides)[number];
const getDimensions = () => Dimensions.get("window");

const HeroBannerCarousel = () => {
  const renderSlideContent = (slide: Slide) => (
    <View style={styles.heroContent}>
      <MaterialCommunityIcons name={slide.icon} size={wp(14)} color="#fff" style={styles.heroIcon} />
      <Text style={styles.heroTitle}>{slide.name}</Text>
      <Text style={styles.heroTagline}>{slide.tagline}</Text>
      <Text style={styles.heroSubtitle}>{slide.description}</Text>
    </View>
  );
  const carouselRef = useRef<ScrollView | null>(null);
  const [dimensions, setDimensions] = useState(getDimensions());
  const indexRef = useRef(0);
  const widthRef = useRef(dimensions.width);
  useEffect(() => {
    widthRef.current = dimensions.width;
  }, [dimensions.width]);
  const jumpTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // The last slide is followed by a copy of the first; once it is reached, jump back silently.
  const resetIfAtEnd = (x: number) => {
    const slideIndex = Math.round(x / widthRef.current);
    if (slideIndex >= slides.length) {
      carouselRef.current?.scrollTo({ x: 0, animated: false });
      indexRef.current = 0;
    } else {
      indexRef.current = slideIndex;
    }
  };
  const onMomentumScrollEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    resetIfAtEnd(e.nativeEvent.contentOffset.x);
  };
  useEffect(() => {
    const subscription = Dimensions.addEventListener("change", ({ window }) => {
      setDimensions(window);
    });
    return () => subscription.remove();
  }, []);
  useEffect(() => {
    const interval = setInterval(() => {
      const next = indexRef.current + 1;
      indexRef.current = next;
      carouselRef.current?.scrollTo({ x: next * widthRef.current, animated: true });
      if (next >= slides.length) {
        // Fallback in case no momentum-end event fires after a programmatic scroll.
        jumpTimer.current = setTimeout(() => {
          carouselRef.current?.scrollTo({ x: 0, animated: false });
          indexRef.current = 0;
        }, 700);
      }
    }, 4000);
    return () => {
      clearInterval(interval);
      if (jumpTimer.current) clearTimeout(jumpTimer.current);
    };
  }, []);
  return (
    <>
      {/* One fixed background; only the text and icon change between slides. */}
      <Image source={HERO_IMAGE} style={styles.heroBackgroundImage} />
      <ScrollView
        ref={carouselRef}
        horizontal
        pagingEnabled
        onMomentumScrollEnd={onMomentumScrollEnd}
        showsHorizontalScrollIndicator={false}
        scrollEventThrottle={16}
      >
        {slides.map((slide) => (
          <View key={slide.key} style={[styles.heroSlideWrapper, { width: dimensions.width }]}>
            {renderSlideContent(slide)}
          </View>
        ))}
        <View style={[styles.heroSlideWrapper, { width: dimensions.width }]}>{renderSlideContent(slides[0])}</View>
      </ScrollView>
    </>
  );
};
export default HeroBannerCarousel;
