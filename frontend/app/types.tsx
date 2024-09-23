// types.ts
export type RootStackParamList = {
    Register: undefined;
    SignUp: undefined;
    Login: undefined;
    Verification: undefined;
    PhoneNumber: undefined;
    BugReportsPage: undefined;
    AppPage: undefined;
    // HOME
    HomePage: undefined;
    HomeTab: undefined;
    // PROFILE
    ProfileTab: undefined;
    EditProfile: { profilePic: string, username: string };
    // GROUPS
    CreateGroup: undefined;
    InviteGroup: { groupID: string, fromCreate: boolean };
    JoinGroup: undefined;
    // BETS
    BetsPage: { groupID: string };
    HeadToHeadPage: { groupID: string, isFinishedRecap: boolean };
    BetRecapPage: { groupID: string };
    BetSummaryPage: { groupID: string };
};
