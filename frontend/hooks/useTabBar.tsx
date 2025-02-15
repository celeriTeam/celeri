import React, { createContext, useContext, useState } from "react";

const TabBarContext = createContext({
  isTabBarVisible: true,
  hideTabBar: () => {}, // We'll show how to use this function later on
  showTabBar: () => {}, // We'll show how to use this function later on.
});

/**
 * This custom hook will provide the context to its consuming component.
 * This is what we give to the `FancyTabBar` so it can know if it should render or not.
 */
export const useTabBar = () => {
  return useContext(TabBarContext);
};

/**
 * We'll get to this part later on
 */
export const TabBarProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [isTabBarVisible, setIsTabBarVisible] = useState(true);

  const value = {
    isTabBarVisible,
    hideTabBar: () => setIsTabBarVisible(false),
    showTabBar: () => setIsTabBarVisible(true),
  };

  return (
    <TabBarContext.Provider value={value}>
      {children}
    </TabBarContext.Provider>
  );
};