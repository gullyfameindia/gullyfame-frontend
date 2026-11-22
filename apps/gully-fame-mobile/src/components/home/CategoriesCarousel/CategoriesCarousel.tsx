import { ScrollView } from "react-native-gesture-handler";
import { styles } from "./styles";
import { categoriesFullData } from "@/types/categories";
import { View, Text } from "react-native";
import { useEffect, useRef, useState } from "react";
import { router } from "expo-router";
import { TALENT_CATEGORIES } from "@/constants/talentCategories";
import CategoryItem from "@/components/CategoryItem/CategoryItem";
import { useScreenActive } from "@/hooks/useScreenActive";
interface CategoriesCarouselProps {
    categories: categoriesFullData[];
}
function CategoriesCarousel({ categories }: CategoriesCarouselProps) {
    const [selectedCategory, setSelectedCategory] = useState<
        number | string | null
    >(0);
    // Fixed 12 talent categories; reuse the backend id when a name matches so the category page still loads.
    const displayCategories: categoriesFullData[] = TALENT_CATEGORIES.map((c) => {
        const match = (categories || []).find((b) => {
            const n = String(b.name || "").trim().toLowerCase();
            return n === c.name.toLowerCase() || n === c.key;
        });
        return { id: match?.id ?? c.key, name: c.name, iconName: c.icon };
    });
    const [pos, setPos] = useState(0);
    const scrollRef = useRef<any>(null);
    const itemX = useRef<number[]>([]);
    const handleCategoryPress = (categoryId: number | string) => {
        setSelectedCategory(
            categoryId === selectedCategory ? null : categoryId,
        );
        router.push(`/(main)/category/${categoryId}`);
    };
    const n = displayCategories.length;
    // Three copies of the list: play in the middle copy and jump back silently, so the loop never ends.
    const loopItems = [...displayCategories, ...displayCategories, ...displayCategories];
    const activeIndex = n ? pos % n : 0;
    const goTo = (p: number, animated: boolean) =>
        scrollRef.current?.scrollTo({ x: Math.max(0, (itemX.current[p] ?? 0) - 8), animated });
    useEffect(() => {
        if (n === 0) return;
        const t = setTimeout(() => {
            setPos(n);
            goTo(n, false);
        }, 100);
        return () => clearTimeout(t);
    }, [n]);
    // Auto-scroll only while Home is on screen: each tick re-renders this row.
    const active = useScreenActive();
    useEffect(() => {
        if (n === 0 || !active) return;
        const intervalId = setInterval(() => {
            setPos((p) => {
                const next = p + 1;
                goTo(next, true);
                if (next >= 2 * n) {
                    setTimeout(() => {
                        goTo(n, false);
                        setPos(n);
                    }, 500);
                }
                return next;
            });
        }, 3500);
        return () => clearInterval(intervalId);
    }, [n, active]);
    if (displayCategories.length === 0) return null;

    return (
        <View style={styles.section}>
            <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Explore Categories</Text>
            </View>

            <ScrollView
                ref={scrollRef}
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.categoriesScroll}
                nestedScrollEnabled={true}
            >
                {loopItems.map((category, index) => (
                    <View
                        key={`${category.id}-${index}`}
                        onLayout={(e) => {
                            itemX.current[index] = e.nativeEvent.layout.x;
                        }}
                    >
                        <CategoryItem
                            category={category}
                            isActive={activeIndex === index}
                            isSelected={category.id === selectedCategory}
                            onPress={() => handleCategoryPress(category.id)}
                        />
                    </View>
                ))}
            </ScrollView>
        </View>
    );
}
export default CategoriesCarousel;
