import React, { useState } from 'react';
import { View, TextInput, StyleSheet, SafeAreaView, Pressable, Keyboard } from 'react-native';
import { useRoute, RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../types';

type InviteGroupRouteProp = RouteProp<RootStackParamList, 'InviteGroup'>;

const InvitePage: React.FC = () => {
const route = useRoute<InviteGroupRouteProp>();
const { groupID } = route.params;
const [inviteCode, setInviteCode] = useState<string>('');

  return (
    <Pressable style={styles.contentView} onPress={Keyboard.dismiss}>
      <SafeAreaView style={styles.contentView}>
        <View style={styles.container}>
          <TextInput
            style={styles.textInput}
            placeholder="Enter Invite Code"
            value={inviteCode}
            onChangeText={setInviteCode}
            placeholderTextColor="#999797"
          />
        </View>
      </SafeAreaView>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  contentView: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: 'white',
  },
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  textInput: {
    width: '80%',
    height: 50,
    borderColor: 'gray',
    borderWidth: 1,
    borderRadius: 5,
    paddingHorizontal: 10,
    fontSize: 18,
  },
});

export default InvitePage;
