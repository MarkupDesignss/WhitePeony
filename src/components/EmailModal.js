import React, { useState, memo, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  TouchableWithoutFeedback,
  Keyboard,
  Alert,
} from 'react-native';
import { Colors } from '../constant';
import TransletText from '../components/TransletText';
import { useAutoTranslate } from '../hooks/useAutoTranslate';

const EmailInput = memo(({ index, value, onChange,text }) => (
  
  <TextInput
    value={value}
    onChangeText={text => onChange(text, index)}
    placeholderTextColor={Colors.text[200]}
    placeholder={`${text || 'Email for Seat'} ${index + 1}`}
    keyboardType="email-address"
    autoCapitalize="none"
    style={{
      borderWidth: 1,
      borderColor: '#ccc',
      borderRadius: 8,
      padding: 12,
      marginVertical: 6,
      fontSize: 14,
    }}
  />
));

const EmailModal = ({ visible, onClose, seatCount, onSubmit }) => {
  const [emails, setEmails] = useState([]);
  const [loading, setLoading] = useState(false);
  const { translatedText: invalidEmailTitle } = useAutoTranslate('Invalid Email');
const { translatedText: invalidEmailDesc } = useAutoTranslate('Please enter a valid email for seat');
const { translatedText: emailForSeatText } = useAutoTranslate('Email for Seat');


  // reset when seatCount changes
  useEffect(() => {
    if (seatCount > 0) {
      setEmails(Array(seatCount).fill(''));
    }
  }, [seatCount]);

  const handleEmailChange = useCallback((text, index) => {
    setEmails(prev => {
      const updated = [...prev];
      updated[index] = text;
      return updated;
    });
  }, []);

  const isValidEmail = email => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const handleSubmit = async () => {
    for (let i = 0; i < emails.length; i++) {
      if (!isValidEmail(emails[i])) {
        Alert.alert(
          invalidEmailTitle || 'Invalid Email',
          `${invalidEmailDesc || 'Please enter a valid email for seat'} ${i + 1}`
        );
        
        return;
      }
    }
    setLoading(true);
    await onSubmit(emails);
    setLoading(false);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={onClose}
    >
      {/* Outer overlay - closes modal when clicked */}
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' }}>
          {/* Inner content - prevents closing when clicked inside */}
          <TouchableWithoutFeedback onPress={() => { }}>
            <View
              style={{
                flex: 1,
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              <View
                style={{
                  backgroundColor: '#fff',
                  padding: 20,
                  marginHorizontal: 20,
                  borderRadius: 12,
                  maxHeight: '80%',
                  width: '90%',
                  elevation: 5,
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.25,
                  shadowRadius: 3.84,
                }}
              >
                {/* Header with title and close button */}
                <View
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: 15,
                  }}
                >
                  <TransletText
                    style={{ fontSize: 18, fontWeight: '600' }}
                    text={`Enter Emails for ${seatCount} Seat${seatCount > 1 ? 's' : ''}`}
                  />

                  <TouchableOpacity onPress={onClose} disabled={loading}>
                    <Text
                      style={{ fontSize: 28, color: '#999', fontWeight: '200' }}
                    >
                      ×
                    </Text>
                  </TouchableOpacity>
                </View>

                <ScrollView
                  keyboardShouldPersistTaps="handled"
                  showsVerticalScrollIndicator={false}
                  style={{ maxHeight: 300 }}
                >
                  {emails.map((email, index) => (
                    <EmailInput
                      key={index}
                      index={index}
                      value={email}
                      onChange={handleEmailChange}
                      text={emailForSeatText}
                    />
                  ))}
                </ScrollView>

                <TouchableOpacity
                  style={{
                    backgroundColor: '#7aa33d',
                    borderRadius: 8,
                    paddingVertical: 14,
                    marginTop: 15,
                    alignItems: 'center',
                  }}
                  onPress={handleSubmit}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <TransletText text="Submit Emails"
                      style={{ color: '#fff', fontSize: 16, fontWeight: '600' }}
                    />
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

export default memo(EmailModal);
