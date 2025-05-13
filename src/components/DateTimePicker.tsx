import React, { useState } from 'react';
import { View, Button, Platform, Text, StyleSheet } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';

type CustomDateTimePickerProps = {
    initialDate?: Date;
    onDateChange?: (date: Date) => void;
    mode?: 'date' | 'time' | 'datetime';
  };

const CustomDateTimePicker = ({
    initialDate = new Date(),
    onDateChange,
    mode = 'datetime',
  }: CustomDateTimePickerProps) => {
  const [date, setDate] = useState(initialDate);
  const [show, setShow] = useState(false);
  
  // Handle the different mode requirements for Android and iOS
  const getPickerMode = () => {
    // On Android, there's only 'date' or 'time'
    if (Platform.OS === 'android') {
      // For 'datetime', we start with 'date' then switch to 'time'
      return androidDisplayMode;
    }
    // On iOS, 'datetime' is supported directly
    if(mode == 'datetime') return 'date';

    return mode;
  };
  
  // For Android, we need two steps for datetime
  const [androidDisplayMode, setAndroidDisplayMode] = useState(
    mode === 'datetime' ? 'date' : mode
  );
  
  // Format the date for display
  const formatDate = () => {
    if (mode === 'date') {
      return date.toLocaleDateString();
    } else if (mode === 'time') {
      return date.toLocaleTimeString();
    } else {
      return date.toLocaleString();
    }
  };

  const onChange = (event: any, selectedDate: any) => {
    if (event.type === 'dismissed') {
      setShow(false);
      return;
    }
    
    const currentDate = selectedDate || date;
    setShow(Platform.OS === 'ios'); // On iOS, don't hide the picker automatically
    setDate(currentDate);
    
    if (Platform.OS === 'android' && mode === 'datetime' && androidDisplayMode === 'date') {
      // Move to time selection after date selection on Android
      setAndroidDisplayMode('time');
      setShow(true);
    } else {
      // Call the callback with the final date
      onDateChange && onDateChange(currentDate);
    }
  };

  const showPicker = () => {
    if (mode === 'datetime' && Platform.OS === 'android') {
      setAndroidDisplayMode('date'); // Start with date for datetime on Android
    } else if (Platform.OS === 'android') {
      setAndroidDisplayMode(mode === 'date' ? 'date' : 'time');
    }
    setShow(true);
  };

  return (
    <View style={styles.container}>
      <View style={styles.buttonContainer}>
        <Button onPress={showPicker} title={`Select ${mode}`} />
      </View>
      
      <Text style={styles.selectedDate}>
        Selected: {formatDate()}
      </Text>
      
      {show && (
        <DateTimePicker
          testID="dateTimePicker"
          value={date}
          mode={getPickerMode()}
          is24Hour={true}
          display="default"
          onChange={onChange}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  buttonContainer: {
    marginBottom: 16,
  },
  selectedDate: {
    fontSize: 16,
    marginBottom: 16,
  }
});

export default CustomDateTimePicker;