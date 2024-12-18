import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import HomeTab from './HomeTab';
import CreateGroupPage from '../groups/CreateGroup';
import JoinGroupPage from '../groups/JoinGroup';
import InvitePage from '../groups/InviteGroup';
import ProfilePage from '../profile/Profile';
import { useRoute } from '@react-navigation/native';
import BetsPage from '../bets/Bets';
import BetSummaryPage from '../bets/BetSummary';
import BetRecapPage from '../bets/Recap';
import HeadToHeadPage from '../bets/HeadToHead';
import { UserProvider } from '../../UserProvider';
import HeadToHeadTutorialPage from '../bets/HeadToHeadTutorial';
import EditGroupPage from '../bets/EditGroup';

const HomeStack = createStackNavigator();

const HomePage: React.FC = () => {
    return (
        <UserProvider>
            <HomeStack.Navigator>
                <HomeStack.Screen name="HomeTab" component={HomeTab} options={{ headerShown: false }} />
                <HomeStack.Screen name="CreateGroup" component={CreateGroupPage} options={{ headerShown: false }} />
                <HomeStack.Screen name="JoinGroup" component={JoinGroupPage} options={{ headerShown: false }} />
                <HomeStack.Screen name="InviteGroup" component={InvitePage} options={{ headerShown: false }} />
                <HomeStack.Screen name="ProfilePage" component={ProfilePage} options={{ headerShown: false }} />
                {/* Bet Screens: */}
                <HomeStack.Screen name="BetsPage" component={BetsPage} options={{ headerShown: false }} />
                <HomeStack.Screen name="HeadToHeadPage" component={HeadToHeadPage} options={{ headerShown: false }} />
                <HomeStack.Screen name="HeadToHeadTutorialPage" component={HeadToHeadTutorialPage} options={{ headerShown: false }} />
                <HomeStack.Screen name="BetSummaryPage" component={BetSummaryPage} options={{ headerShown: false }} />
                <HomeStack.Screen name="BetRecapPage" component={BetRecapPage} options={{ presentation: 'modal', headerShown: false }} />
                <HomeStack.Screen name="EditGroupPage" component={EditGroupPage} options={{ headerShown: false }} />
            </HomeStack.Navigator>
        </UserProvider>
    );
};

export default HomePage;
