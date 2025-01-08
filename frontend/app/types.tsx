// types.ts
export type RootStackParamList = {
    Register: undefined;
    SignUp: undefined;
    Login: undefined;
    ForgotPassword: undefined;
    Verification: undefined;
    PhoneNumber: undefined;
    BugReportsPage: undefined;
    AppPage: undefined;
    // HOME
    HomePage: undefined;
    HomeTab: undefined;
    // PROFILE
    ProfileTab: undefined;
    PersonalProfilePage: undefined;
    ProfilePage: { selectedUserID: string, groupID: string };
    EditProfile: undefined;
    // GROUPS
    CreateGroup: undefined;
    InviteGroup: { leaderID: string, groupID: string, fromCreate: boolean };
    JoinGroup: undefined;
    // BETS
    BetsPage: { groupID: string };
    HeadToHeadPage: { groupID: string };
    HeadToHeadTutorialPage: { groupID: string };
    BetRecapPage: { groupID: string };
    BetHistoryPage: {groupID: string };
    BetSummaryPage: { groupID: string };
    StorePage: {groupID: string};
    EditGroupPage: {groupID: string};
    NewBetSummaryPage: {groupID: string};
};
