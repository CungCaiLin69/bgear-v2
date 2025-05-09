import React, { useEffect, useState, useRef, useCallback } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  FlatList, 
  KeyboardAvoidingView, 
  Platform, 
  StyleSheet,
  Alert,
  ActivityIndicator,
  TouchableOpacity
} from 'react-native';
import { useAuth } from '../../utils/AuthProvider';
import { useSocket } from '../../utils/SocketProvider';
import { useLocalSearchParams, useFocusEffect, router } from 'expo-router';
import Icon from 'react-native-vector-icons/Ionicons';

type Message = {
  id: number;
  orderId: number;
  senderId: string;       
  senderRole: string;     
  message: string;
  createdAt: Date | string;  
};

export default function ChatScreen() {
  const params = useLocalSearchParams();
  const orderId = params.orderId ? Number(params.orderId) : null;

  const { user, userToken } = useAuth();
  const { socket, showChatNotification } = useSocket();

  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [unreadCount, setUnreadCount] = useState(0);
  const [isChatFocused, setIsChatFocused] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [orderInfo, setOrderInfo] = useState<any>(null);

  const flatListRef = useRef<FlatList>(null);
  const wasScrolledToBottom = useRef(true);
  // Add a ref to track messages already received to prevent duplicates
  const processedMessageIds = useRef(new Set<number>());

  useFocusEffect(
    useCallback(() => {
      setIsChatFocused(true);
      setUnreadCount(0);
      return () => setIsChatFocused(false);
    }, [])
  );

  // Fetch order info to get the counterparty details
  const fetchOrderInfo = async () => {
    if (!userToken || !orderId) return;
    
    try {
      const response = await fetch(`http://10.0.2.2:3000/api/order/${orderId}`, {
        headers: { Authorization: `Bearer ${userToken}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        setOrderInfo(data.order);
      }
    } catch (error) {
      console.error('Error fetching order info:', error);
    }
  };

  const fetchPreviousMessages = async () => {
    if (!userToken || !orderId) {
      console.log('Cannot fetch messages: missing token or order ID');
      return;
    }
    
    setIsLoading(true);
    
    try {
      console.log(`Fetching messages for order ${orderId}`);
      const response = await fetch(`http://10.0.2.2:3000/api/messages/${orderId}`, {
        headers: {
          Authorization: `Bearer ${userToken}`
        }
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Server error: ${response.status}`, errorText);
        throw new Error(`Server error: ${response.status}`);
      }
      
      const data = await response.json();
      console.log(`Received data:`, data);
      
      if (data.messages && Array.isArray(data.messages)) {
        // Format messages properly before setting state
        const formattedMessages = data.messages.map((msg: { id: any; orderId: any; senderId: any; senderRole: any; message: any; createdAt: any; }) => ({
          id: msg.id,
          orderId: msg.orderId,
          senderId: msg.senderId,
          senderRole: msg.senderRole,
          message: msg.message,
          createdAt: msg.createdAt
        }));
        
        // Store all existing message IDs to avoid duplicates
        formattedMessages.forEach((msg: { id: number; }) => {
          processedMessageIds.current.add(msg.id);
        });
        
        setMessages(formattedMessages);
      } else {
        console.warn('Received invalid messages format:', data);
        setMessages([]);
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
      Alert.alert(
        'Connection Error',
        'Could not load previous messages. Please check your connection.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!socket || !orderId) return;

    // Join the order chat room
    socket.emit('joinOrderRoom', { orderId });
    console.log('Joining room for order:', orderId);
    
    // Fetch previous messages and order info when component mounts
    fetchOrderInfo();
    fetchPreviousMessages();

    const loadingTimeout = setTimeout(() => {
      if (isLoading) {
        console.log('Loading timeout reached, forcing loading state to false');
        setIsLoading(false);
      }
    }, 10000);

    // Listen for new messages
    const handleNewMessage = (msg: Message) => {
      console.log('Received new message:', msg);
      
      // Check if we've already processed this message to avoid duplicates
      if (processedMessageIds.current.has(msg.id)) {
        console.log('Duplicate message detected, ignoring:', msg.id);
        return;
      }
      
      // Mark this message as processed
      processedMessageIds.current.add(msg.id);
      
      // Add the new message to state
      setMessages(prev => {
        const exists = prev.some(m => 
          // Check by ID if available, otherwise check content and timestamp
          (m.id === msg.id) || (m.message === msg.message && m.senderId === msg.senderId && Math.abs(new Date(m.createdAt).getTime() - new Date(msg.createdAt).getTime()) < 5000)
        );
        if (exists) return prev;
        return [...prev, msg];
      });
      
      // Update unread count if message is from other user and chat is not focused
      if (user && msg.senderId !== user.id && !isChatFocused) {
        setUnreadCount(prev => prev + 1);
        showChatNotification(
          `New message from ${msg.senderRole === 'repairman' ? 'Repairman' : 'Customer'}: ${msg.message}`,
          orderId, msg.senderId
        );
      }

      // Scroll to bottom if already at bottom
      if (wasScrolledToBottom.current) {
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }, 100);
      }
    };

    socket.on('newMessage', handleNewMessage);
    
    // Handle order cancellation
    const handleOrderCancelled = () => {
      Alert.alert('Order Cancelled', 'This order has been cancelled.', [
        { text: 'OK', onPress: () => router.replace(user?.is_repairman ? '/order-repairman' : '/') }
      ]);
    };
    
    socket.on('orderCancelled', handleOrderCancelled);
    socket.on('orderCanceled', handleOrderCancelled); // Handle both spellings

    // Clean up listeners when component unmounts
    return () => {
      clearTimeout(loadingTimeout);
      socket.off('newMessage', handleNewMessage);
      socket.off('orderCancelled', handleOrderCancelled);
      socket.off('orderCanceled', handleOrderCancelled);
      socket.emit('leaveOrderRoom', { orderId });
    };
  }, [socket, orderId, user, isChatFocused, showChatNotification]);

  const sendMessage = () => {
    if (!user || !user.phoneNumber) {
      Alert.alert('Error', 'User information incomplete');
      return;
    }
  
    const trimmedMessage = inputMessage.trim();
    if (!trimmedMessage || !orderId) return;
  
    // Create type-safe optimistic message
    const optimisticMessage: Message = {
      id: Date.now(),
      orderId: Number(orderId),
      senderId: user.id || user.phoneNumber, // Ensure this is always string
      senderRole: user.role || (user.is_repairman ? 'repairman' : 'customer'),
      message: trimmedMessage,
      createdAt: new Date()
    };
  
    setMessages(prev => [...prev, optimisticMessage]);
    setInputMessage('');
  
    try {
      // Send message via socket
      socket?.emit('sendMessage', {
        orderId: Number(orderId),
        senderId: optimisticMessage.senderId,
        senderRole: optimisticMessage.senderRole,
        message: trimmedMessage
      });
    } catch (error) {
      // Rollback optimistic update on error
      setMessages(prev => prev.filter(msg => msg.id !== optimisticMessage.id));
      Alert.alert('Error', 'Failed to send message');
    }
  
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  // Handle scroll events to track if user is at bottom
  const handleScroll = (event: any) => {
    const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
    const paddingToBottom = 20;
    wasScrolledToBottom.current = 
      layoutMeasurement.height + contentOffset.y >= 
      contentSize.height - paddingToBottom;
      
    // If scrolled to bottom, reset unread count
    if (wasScrolledToBottom.current) {
      setUnreadCount(0);
    }
  };

  // Correctly format the timestamp
  const formatTime = (dateString: Date | string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Get user/counterparty display name
  const getCounterpartyName = () => {
    if (!orderInfo) return user?.is_repairman ? 'Customer' : 'Repairman';
    
    if (user?.is_repairman) {
      return orderInfo.user?.name || 'Customer';
    } else {
      return orderInfo.repairman?.user?.name || 'Repairman';
    }
  };

  return (
    <View style={styles.container}>
      {/* Chat header with user info */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Icon name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>
            {getCounterpartyName()}
          </Text>
          <Text style={styles.headerSubtitle}>
            Order #{orderId} • {orderInfo?.status || 'Active'}
          </Text>
        </View>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.keyboardView}
        keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
      >
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#3498db" />
            <Text style={styles.loadingText}>Loading messages...</Text>
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={(item) => item.id.toString()}
            renderItem={({ item }) => {
              // Determine if message is from current user
              const isMyMessage = user && (item.senderId === user.id || item.senderId === user.phoneNumber);
              
              // Determine if sender is repairman (regardless of current user)
              const isRepairmanMessage = item.senderRole === 'repairman';
              
              return (
                <View style={[
                  styles.messageBubble,
                  isMyMessage 
                    ? styles.myMessage 
                    : isRepairmanMessage 
                      ? styles.repairmanMessage 
                      : styles.customerMessage
                ]}>
                  <Text style={styles.senderRole}>
                    {isMyMessage 
                      ? 'Me' 
                      : isRepairmanMessage ? 'Repairman' : 'Customer'}
                  </Text>
                  <Text style={styles.messageText}>{item.message}</Text>
                  <Text style={styles.timeText}>{formatTime(item.createdAt)}</Text>
                </View>
              );
            }}
            onContentSizeChange={() => {
              if (wasScrolledToBottom.current) {
                flatListRef.current?.scrollToEnd({ animated: false });
              }
            }}
            onLayout={() => {
              flatListRef.current?.scrollToEnd({ animated: false });
              wasScrolledToBottom.current = true;
            }}
            onScroll={handleScroll}
            scrollEventThrottle={400}
            contentContainerStyle={styles.messageList}
            ListEmptyComponent={() => (
              <View style={styles.emptyContainer}>
                <Icon name="chatbubble-ellipses-outline" size={50} color="#CCCCCC" />
                <Text style={styles.emptyText}>No messages yet</Text>
                <Text style={styles.emptySubtext}>
                  Start the conversation with {user?.is_repairman ? 'the customer' : 'your repairman'}
                </Text>
              </View>
            )}
          />
        )}

        {unreadCount > 0 && !wasScrolledToBottom.current && (
          <TouchableOpacity 
            style={styles.unreadBadge}
            onPress={() => {
              flatListRef.current?.scrollToEnd({ animated: true });
              setUnreadCount(0);
              wasScrolledToBottom.current = true;
            }}
          >
            <Text style={styles.unreadText}>{unreadCount} new message{unreadCount > 1 ? 's' : ''}</Text>
            <Icon name="chevron-down" size={16} color="white" />
          </TouchableOpacity>
        )}

        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            value={inputMessage}
            onChangeText={setInputMessage}
            placeholder="Type a message..."
            multiline
            maxLength={500}
          />
          <TouchableOpacity 
            style={[
              styles.sendButton, 
              !inputMessage.trim() && styles.sendButtonDisabled
            ]} 
            onPress={sendMessage} 
            disabled={!inputMessage.trim()}
          >
            <Icon name="send" size={20} color="white" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  keyboardView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    paddingVertical: 12,
    paddingHorizontal: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  backButton: {
    paddingRight: 12,
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#666',
  },
  messageList: {
    paddingVertical: 15,
    paddingHorizontal: 10,
    flexGrow: 1,
  },
  myMessage: {
    alignSelf: 'flex-end',
    backgroundColor: '#DCF8C6', // Light green
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    borderBottomLeftRadius: 18,
    borderBottomRightRadius: 4,
    marginLeft: 50, 
  },
  repairmanMessage: {
    alignSelf: 'flex-start',
    backgroundColor: '#E3F2FD', // Light blue for repairman
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    borderBottomLeftRadius: 4,
    borderBottomRightRadius: 18,
    marginRight: 50, 
  },
  customerMessage: {
    alignSelf: 'flex-start',
    backgroundColor: '#FFFFFF', // White for customer
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    borderBottomLeftRadius: 4,
    borderBottomRightRadius: 18,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    marginRight: 50, 
  },
  messageBubble: {
    padding: 12,
    marginVertical: 6,
    marginHorizontal: 8,
    maxWidth: '75%',
    minWidth: 80,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 1,
  },
  senderRole: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#555',
    marginBottom: 4,
  },
  messageText: {
    fontSize: 16,
    color: '#000',
    lineHeight: 22,
  },
  timeText: {
    fontSize: 11,
    color: '#666',
    marginTop: 4,
    textAlign: 'right',
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 12,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 24,
    borderColor: '#D0D0D0',
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 10,
    backgroundColor: '#FFFFFF',
    maxHeight: 100,
    fontSize: 16,
  },
  sendButton: {
    backgroundColor: '#3498db',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#B2DFFC',
  },
  unreadBadge: {
    position: 'absolute',
    bottom: 80,
    alignSelf: 'center',
    backgroundColor: '#3498db',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
  },
  unreadText: {
    color: 'white',
    marginRight: 10,
    fontWeight: '500',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    opacity: 0.7,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#999',
    marginTop: 12,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    marginTop: 8,
  },
});