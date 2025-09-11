import { Tabs } from 'expo-router';
import { Image, Dimensions, Platform } from 'react-native';
import TabBar from "@components/TabBar";
import { useTabBar } from '@hooks/useTabBar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';


const { width, height } = Dimensions.get('window');

// Guidelines based on my test device (iPhone 16):
const guidelineBaseWidth = 393;   // 1179 / 3
const guidelineBaseHeight = 852;  // 2556 / 3

// Scale functions to calculate sizes proportionate to the device dimensions
const scale = (size: number) => (width / guidelineBaseWidth) * size;
const verticalScale = (size: number) => (height / guidelineBaseHeight) * size;
const moderateScale = (size: number, factor = 0.5) => size + (scale(size) - size) * factor;


export default function TabsLayout() {
  const { isTabBarVisible } = useTabBar();
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={({ route }: { route: { name: string } }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#1b2c1c',
          borderTopWidth: 0,
          paddingBottom: insets.bottom, // this accounts for the bottom safe area
          paddingTop: Platform.OS === 'ios' ? verticalScale(10) : 0, // Adjust padding for iOS
          height: (isTabBarVisible ? verticalScale(60) : 0) + insets.bottom, // <-- THE MAGIC
        },
        tabBarShowLabel: false,
        tabBarActiveTintColor: '#51ba51',
        tabBarInactiveTintColor: '#ffffff',
        tabBarIcon: ({ focused, color }: { focused: boolean; color: string }) => {
          let iconSource, width, height;

          if (route.name === 'home') {
            iconSource = require('@assets/icons/home.png');
            width = focused ? 24 : 22;
            height = focused ? 26 : 24;
          } else if (route.name === 'competition') {
            iconSource = require('@assets/icons/shoe.png');
            width = focused ? 22 : 20;
            height = focused ? 25 : 23;
          } else if (route.name === 'profile') {
            iconSource = require('@assets/icons/profile.png');
            width = focused ? 22 : 20;
            height = focused ? 25 : 23;
          } else if (route.name === 'bugReports') {
            iconSource = require('@assets/icons/bugReports.png');
            width = focused ? 31 : 29;
            height = focused ? 31 : 29;
          }

          return (
            <Image
              source={iconSource}
              style={{
                width,
                height,
                tintColor: color,
                opacity: focused ? 1 : 0.7,
              }}
            />
          );
        },
      })}
      tabBar={(props) => <TabBar {...props} />}
    >
      <Tabs.Screen name="home" options={{ title: 'Home' }} />
      <Tabs.Screen name="competition" options={{ title: 'Competition' }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile' }} />
      <Tabs.Screen name="bugReports" options={{ title: 'Bug Reports' }} />
    </Tabs>
  );
}
