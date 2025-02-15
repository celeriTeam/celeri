import React from "react";
// Importing `BottomTabBarProps` allows us to ask for the same types as React Navigation
import { BottomTabBar, BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { useTabBar } from "../hooks/useTabBar"; // We'll get to this later

const TabBar: React.FC<BottomTabBarProps> = (props: BottomTabBarProps) => {
  const { isTabBarVisible } = useTabBar(); // We'll get to this later

  if (!isTabBarVisible) {
    return null;
  }

  return <BottomTabBar {...props} />;
};

export default TabBar;