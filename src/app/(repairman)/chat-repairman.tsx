import React, { useEffect, useState, useRef } from 'react';
import { View, Text, TextInput, Button, FlatList, KeyboardAvoidingView, Platform, StyleSheet } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuth } from '../../utils/AuthProvider';
import { useSocket } from '../../utils/SocketProvider';

type RootStackParamList = {
  ChatScreen: { orderId: number };
};

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'ChatScreen'>;
  route: {
    params: {
      orderId: number;
    };
  };
};

type Message = {
  senderId: string;
  senderRole: string;
  message: string;
  createdAt: Date;
};

export default function ChatScreen({ navigation, route }: Props) {
  const { user, userToken } = useAuth();
  const { socket } = useSocket();
  const { orderId } = route.params;

  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');

  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    if (!socket) return;

    socket.emit('joinOrderRoom', { orderId });

    socket.on('newMessage', (msg: Message) => {
      console.log('Received new message:', msg);
      setMessages(prev => [...prev, msg]);
    });

    return () => {
      socket.off('newMessage');
    };
  }, [socket, orderId]);

  const sendMessage = () => {
    if (!user) {
      console.error('User is null. Cannot send message.');
      return;
    }
  
    if (!inputMessage.trim()) return;
  
    socket?.emit('sendMessage', {
      orderId,
      senderId: user.id,
      senderRole: user.role,
      message: inputMessage.trim(),
    });
  
    setInputMessage('');
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={{ flex: 1 }}
    >
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item, index) => index.toString()}
        renderItem={({ item }) => (
            <View style={[
                styles.messageBubble,
                user && item.senderId === user.id ? styles.myMessage : styles.theirMessage
              ]}>              
            <Text style={styles.messageText}>{item.message}</Text>
            <Text style={styles.timeText}>{new Date(item.createdAt).toLocaleTimeString()}</Text>
          </View>
        )}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
        onLayout={() => flatListRef.current?.scrollToEnd({ animated: true })}
      />

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          value={inputMessage}
          onChangeText={setInputMessage}
          placeholder="Type a message..."
        />
        <Button title="Send" onPress={sendMessage} />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  messageBubble: {
    padding: 10,
    marginVertical: 5,
    marginHorizontal: 10,
    borderRadius: 10,
    maxWidth: '80%',
  },
  myMessage: {
    alignSelf: 'flex-end',
    backgroundColor: '#DCF8C6',
  },
  theirMessage: {
    alignSelf: 'flex-start',
    backgroundColor: '#E5E5EA',
  },
  messageText: {
    fontSize: 16,
  },
  timeText: {
    fontSize: 10,
    color: 'gray',
    marginTop: 5,
    textAlign: 'right',
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 10,
    backgroundColor: 'white',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 10,
    marginRight: 10,
  },
});
