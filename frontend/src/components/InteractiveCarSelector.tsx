/**
 * Interactive Car Selector - Bottom Footer Component
 * Shows a morphing car icon that expands to show brands/models in a 5x2 grid
 * with floating products grid, filters, and search
 */
import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  ScrollView,
  TextInput,
  Image,
  Animated,
  Modal,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../hooks/useTheme';
import { useTranslation } from '../hooks/useTranslation';
import { useAppStore } from '../store/appStore';
import { productApi } from '../services/api';

const { width, height } = Dimensions.get('window');
const GRID_COLUMNS = 5;
const GRID_ROWS = 2;

interface CarBrand {
  id: string;
  name: string;
  name_ar?: string;
  logo_url?: string;
}

interface CarModel {
  id: string;
  name: string;
  name_ar?: string;
  brand_id: string;
  year_start?: number;
  year_end?: number;
}

interface Product {
  id: string;
  name: string;
  name_ar?: string;
  price: number;
  image?: string;
  sku?: string;
}

type SelectorState = 'collapsed' | 'brands' | 'models' | 'products';

export const InteractiveCarSelector: React.FC = () => {
  const { colors, isDark } = useTheme();
  const { language, isRTL } = useTranslation();
  const router = useRouter();
  
  // Get data from store
  const carBrands = useAppStore((state) => state.carBrands);
  const carModels = useAppStore((state) => state.carModels);
  
  // Local state
  const [selectorState, setSelectorState] = useState<SelectorState>('collapsed');
  const [selectedBrand, setSelectedBrand] = useState<CarBrand | null>(null);
  const [selectedModel, setSelectedModel] = useState<CarModel | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [priceFilter, setPriceFilter] = useState<'all' | 'low' | 'medium' | 'high'>('all');
  
  // Animations
  const expandAnim = useRef(new Animated.Value(0)).current;
  const carIconRotate = useRef(new Animated.Value(0)).current;
  const carIconScale = useRef(new Animated.Value(1)).current;
  const gridOpacity = useRef(new Animated.Value(0)).current;
  const productsSlideAnim = useRef(new Animated.Value(height)).current;
  
  // Morphing car animation - rotate on state change
  useEffect(() => {
    if (selectorState !== 'collapsed') {
      Animated.parallel([
        Animated.spring(carIconRotate, {
          toValue: 1,
          useNativeDriver: true,
          tension: 100,
          friction: 8,
        }),
        Animated.spring(carIconScale, {
          toValue: 1.2,
          useNativeDriver: true,
          tension: 100,
          friction: 8,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.spring(carIconRotate, {
          toValue: 0,
          useNativeDriver: true,
          tension: 100,
          friction: 8,
        }),
        Animated.spring(carIconScale, {
          toValue: 1,
          useNativeDriver: true,
          tension: 100,
          friction: 8,
        }),
      ]).start();
    }
  }, [selectorState]);
  
  // Expand/collapse animation
  useEffect(() => {
    if (selectorState === 'collapsed') {
      Animated.parallel([
        Animated.timing(expandAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: false,
        }),
        Animated.timing(gridOpacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    } else if (selectorState === 'brands' || selectorState === 'models') {
      Animated.parallel([
        Animated.spring(expandAnim, {
          toValue: 1,
          useNativeDriver: false,
          tension: 60,
          friction: 10,
        }),
        Animated.timing(gridOpacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [selectorState]);
  
  // Products slide animation
  useEffect(() => {
    if (selectorState === 'products') {
      Animated.spring(productsSlideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 60,
        friction: 10,
      }).start();
    } else {
      Animated.timing(productsSlideAnim, {
        toValue: height,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [selectorState]);
  
  // Fetch products when model is selected
  const fetchProductsForModel = useCallback(async (modelId: string) => {
    setLoadingProducts(true);
    try {
      const response = await productApi.getAll({ car_model_id: modelId, limit: 100 });
      setProducts(response.data?.products || []);
    } catch (error) {
      console.error('Error fetching products:', error);
      setProducts([]);
    } finally {
      setLoadingProducts(false);
    }
  }, []);
  
  const handleAnchorPress = () => {
    if (selectorState === 'collapsed') {
      setSelectorState('brands');
    } else {
      // Collapse back
      setSelectorState('collapsed');
      setSelectedBrand(null);
      setSelectedModel(null);
      setProducts([]);
      setSearchQuery('');
      setPriceFilter('all');
    }
  };
  
  const handleBrandSelect = (brand: CarBrand) => {
    setSelectedBrand(brand);
    setSelectorState('models');
  };
  
  const handleModelSelect = (model: CarModel) => {
    setSelectedModel(model);
    setSelectorState('products');
    fetchProductsForModel(model.id);
  };
  
  const handleBackToModels = () => {
    setSelectorState('models');
    setSelectedModel(null);
    setProducts([]);
  };
  
  const handleBackToBrands = () => {
    setSelectorState('brands');
    setSelectedBrand(null);
    setSelectedModel(null);
  };
  
  const handleProductPress = (productId: string) => {
    router.push(`/product/${productId}`);
    // Collapse after navigation
    setSelectorState('collapsed');
    setSelectedBrand(null);
    setSelectedModel(null);
    setProducts([]);
  };
  
  const getName = (item: { name: string; name_ar?: string }) => 
    language === 'ar' ? (item.name_ar || item.name) : item.name;
  
  // Filter products
  const filteredProducts = products.filter((p) => {
    const matchesSearch = searchQuery === '' || 
      p.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.name_ar?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.sku?.toLowerCase().includes(searchQuery.toLowerCase());
    
    let matchesPrice = true;
    if (priceFilter === 'low') matchesPrice = p.price < 100;
    else if (priceFilter === 'medium') matchesPrice = p.price >= 100 && p.price < 500;
    else if (priceFilter === 'high') matchesPrice = p.price >= 500;
    
    return matchesSearch && matchesPrice;
  });
  
  // Get filtered brands/models for grid
  const displayBrands = carBrands.slice(0, GRID_COLUMNS * GRID_ROWS);
  const filteredModels = selectedBrand 
    ? carModels.filter((m) => m.brand_id === selectedBrand.id).slice(0, GRID_COLUMNS * GRID_ROWS) 
    : [];
  
  const carRotation = carIconRotate.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });
  
  const containerHeight = expandAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [70, 200],
  });

  if (carBrands.length === 0) {
    return null; // Don't show if no data
  }

  return (
    <>
      {/* Main Anchor/Footer Bar */}
      <Animated.View 
        style={[
          styles.container, 
          { 
            height: containerHeight,
            backgroundColor: isDark ? 'rgba(30,30,30,0.95)' : 'rgba(255,255,255,0.95)',
            borderTopColor: colors.border,
          }
        ]}
      >
        {/* Anchor Button Row */}
        <View style={styles.anchorRow}>
          <TouchableOpacity 
            style={[styles.anchorButton, { backgroundColor: colors.primary }]}
            onPress={handleAnchorPress}
            activeOpacity={0.8}
          >
            <Animated.View style={{ transform: [{ rotate: carRotation }, { scale: carIconScale }] }}>
              <MaterialCommunityIcons 
                name={selectorState === 'collapsed' ? 'car-sports' : 'close'} 
                size={28} 
                color="#FFF" 
              />
            </Animated.View>
          </TouchableOpacity>
          
          {/* Breadcrumb when expanded */}
          {selectorState !== 'collapsed' && (
            <Animated.View style={[styles.breadcrumb, { opacity: gridOpacity }]}>
              {selectedBrand && (
                <TouchableOpacity 
                  style={[styles.breadcrumbItem, { backgroundColor: colors.surface }]}
                  onPress={handleBackToBrands}
                >
                  <Text style={[styles.breadcrumbText, { color: colors.primary }]}>
                    {getName(selectedBrand)}
                  </Text>
                  <Ionicons name="chevron-forward" size={14} color={colors.primary} />
                </TouchableOpacity>
              )}
              {selectedModel && (
                <TouchableOpacity 
                  style={[styles.breadcrumbItem, { backgroundColor: colors.primary + '20' }]}
                  onPress={handleBackToModels}
                >
                  <Text style={[styles.breadcrumbText, { color: colors.primary }]}>
                    {getName(selectedModel)}
                  </Text>
                </TouchableOpacity>
              )}
            </Animated.View>
          )}
          
          {/* Hint text when collapsed */}
          {selectorState === 'collapsed' && (
            <View style={styles.hintContainer}>
              <Text style={[styles.hintText, { color: colors.textSecondary }]}>
                {language === 'ar' ? 'اختر سيارتك' : 'Select Your Car'}
              </Text>
              <Ionicons name="chevron-up" size={16} color={colors.textSecondary} />
            </View>
          )}
        </View>
        
        {/* Grid Container */}
        {(selectorState === 'brands' || selectorState === 'models') && (
          <Animated.View style={[styles.gridContainer, { opacity: gridOpacity }]}>
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.gridScroll}
            >
              <View style={styles.grid}>
                {(selectorState === 'brands' ? displayBrands : filteredModels).map((item, index) => (
                  <TouchableOpacity
                    key={item.id}
                    style={[
                      styles.gridItem,
                      { backgroundColor: colors.surface, borderColor: colors.border },
                    ]}
                    onPress={() => 
                      selectorState === 'brands' 
                        ? handleBrandSelect(item as CarBrand) 
                        : handleModelSelect(item as CarModel)
                    }
                  >
                    {selectorState === 'brands' && (item as CarBrand).logo_url ? (
                      <Image 
                        source={{ uri: (item as CarBrand).logo_url }} 
                        style={styles.brandLogo} 
                        resizeMode="contain"
                      />
                    ) : (
                      <MaterialCommunityIcons 
                        name={selectorState === 'brands' ? 'car' : 'car-side'} 
                        size={22} 
                        color={colors.primary} 
                      />
                    )}
                    <Text 
                      style={[styles.gridItemText, { color: colors.text }]} 
                      numberOfLines={1}
                    >
                      {getName(item)}
                    </Text>
                  </TouchableOpacity>
                ))}
                
                {/* View All button */}
                <TouchableOpacity
                  style={[
                    styles.gridItem,
                    styles.viewAllItem,
                    { backgroundColor: colors.primary + '15', borderColor: colors.primary },
                  ]}
                  onPress={() => {
                    if (selectorState === 'brands') {
                      router.push('/car-brands');
                    } else if (selectedBrand) {
                      router.push(`/brand/${selectedBrand.id}`);
                    }
                    setSelectorState('collapsed');
                  }}
                >
                  <Ionicons name="grid" size={22} color={colors.primary} />
                  <Text style={[styles.gridItemText, { color: colors.primary }]}>
                    {language === 'ar' ? 'عرض الكل' : 'View All'}
                  </Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </Animated.View>
        )}
      </Animated.View>
      
      {/* Products Floating Panel */}
      <Animated.View 
        style={[
          styles.productsPanel,
          { 
            transform: [{ translateY: productsSlideAnim }],
            backgroundColor: colors.background,
          }
        ]}
      >
        {/* Header */}
        <View style={[styles.productsPanelHeader, { borderBottomColor: colors.border }]}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={handleBackToModels}
          >
            <Ionicons name={isRTL ? 'chevron-forward' : 'chevron-back'} size={24} color={colors.text} />
          </TouchableOpacity>
          <View style={styles.headerTitleContainer}>
            <Text style={[styles.headerTitle, { color: colors.text }]}>
              {selectedModel ? getName(selectedModel) : ''}
            </Text>
            <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
              {filteredProducts.length} {language === 'ar' ? 'منتج' : 'products'}
            </Text>
          </View>
          <TouchableOpacity 
            style={styles.closeButton}
            onPress={() => setSelectorState('collapsed')}
          >
            <Ionicons name="close" size={24} color={colors.text} />
          </TouchableOpacity>
        </View>
        
        {/* Search & Filters */}
        <View style={[styles.filtersRow, { backgroundColor: colors.card }]}>
          <View style={[styles.searchBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Ionicons name="search" size={18} color={colors.textSecondary} />
            <TextInput
              style={[styles.searchInput, { color: colors.text }]}
              placeholder={language === 'ar' ? 'بحث...' : 'Search...'}
              placeholderTextColor={colors.textSecondary}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {(['all', 'low', 'medium', 'high'] as const).map((filter) => (
              <TouchableOpacity
                key={filter}
                style={[
                  styles.filterChip,
                  { 
                    backgroundColor: priceFilter === filter ? colors.primary : colors.surface,
                    borderColor: priceFilter === filter ? colors.primary : colors.border,
                  },
                ]}
                onPress={() => setPriceFilter(filter)}
              >
                <Text 
                  style={[
                    styles.filterChipText, 
                    { color: priceFilter === filter ? '#FFF' : colors.text }
                  ]}
                >
                  {filter === 'all' ? (language === 'ar' ? 'الكل' : 'All') :
                   filter === 'low' ? (language === 'ar' ? '<100' : '<100') :
                   filter === 'medium' ? '100-500' : '>500'}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
        
        {/* Products Grid */}
        {loadingProducts ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : filteredProducts.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="cube-outline" size={48} color={colors.textSecondary} />
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              {language === 'ar' ? 'لا توجد منتجات' : 'No products found'}
            </Text>
          </View>
        ) : (
          <FlatList
            data={filteredProducts}
            numColumns={2}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.productsGrid}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[styles.productCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                onPress={() => handleProductPress(item.id)}
              >
                {item.image ? (
                  <Image source={{ uri: item.image }} style={styles.productImage} />
                ) : (
                  <View style={[styles.productImagePlaceholder, { backgroundColor: colors.surface }]}>
                    <Ionicons name="cube-outline" size={32} color={colors.textSecondary} />
                  </View>
                )}
                <Text style={[styles.productName, { color: colors.text }]} numberOfLines={2}>
                  {getName(item)}
                </Text>
                <Text style={[styles.productPrice, { color: colors.primary }]}>
                  {item.price?.toFixed(2)} {language === 'ar' ? 'ج.م' : 'EGP'}
                </Text>
              </TouchableOpacity>
            )}
          />
        )}
      </Animated.View>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopWidth: 1,
    zIndex: 1000,
  },
  anchorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 12,
  },
  anchorButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  hintContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  hintText: {
    fontSize: 14,
    fontWeight: '500',
  },
  breadcrumb: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  breadcrumbItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 4,
  },
  breadcrumbText: {
    fontSize: 13,
    fontWeight: '600',
  },
  gridContainer: {
    paddingBottom: 12,
  },
  gridScroll: {
    paddingHorizontal: 12,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  gridItem: {
    width: 70,
    height: 70,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    padding: 4,
  },
  viewAllItem: {
    borderWidth: 1.5,
  },
  brandLogo: {
    width: 30,
    height: 30,
  },
  gridItemText: {
    fontSize: 10,
    fontWeight: '500',
    marginTop: 4,
    textAlign: 'center',
  },
  productsPanel: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 2000,
  },
  productsPanelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 12,
    borderBottomWidth: 1,
    paddingTop: 50, // Safe area
  },
  backButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  headerSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  closeButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filtersRow: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 10,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    padding: 0,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    marginRight: 8,
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  emptyText: {
    fontSize: 14,
  },
  productsGrid: {
    padding: 12,
  },
  productCard: {
    flex: 1,
    margin: 6,
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
    maxWidth: (width - 48) / 2,
  },
  productImage: {
    width: '100%',
    height: 100,
  },
  productImagePlaceholder: {
    width: '100%',
    height: 100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  productName: {
    fontSize: 13,
    fontWeight: '500',
    padding: 8,
    paddingBottom: 4,
  },
  productPrice: {
    fontSize: 14,
    fontWeight: '700',
    paddingHorizontal: 8,
    paddingBottom: 10,
  },
});

export default InteractiveCarSelector;
