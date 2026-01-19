import React, { useState, memo, useCallback } from "react";
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
} from "react-native";

const EmailInput = memo(({ index, value, onChange }) => (
  <TextInput
    value={value}
    onChangeText={(text) => onChange(text, index)}
    placeholderTextColor={Colors.text[200]}
    placeholder={`Email for Seat ${index + 1}`}
    keyboardType="email-address"
    autoCapitalize="none"
    style={{
      borderWidth: 1,
      borderColor: "#ccc",
      borderRadius: 8,
      padding: 10,
      marginVertical: 5,
    }}
  />
));

const EmailModal = ({ visible, onClose, seatCount, onSubmit }) => {
  const [emails, setEmails] = useState([]);
  const [loading, setLoading] = useState(false);

  // reset when seatCount changes
  React.useEffect(() => {
    if (seatCount > 0) {
      setEmails(Array(seatCount).fill(""));
    }
  }, [seatCount]);

  const handleEmailChange = useCallback((text, index) => {
    setEmails((prev) => {
      const updated = [...prev];
      updated[index] = text;
      return updated;
    });
  }, []);

  const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const handleSubmit = async () => {
    for (let i = 0; i < emails.length; i++) {
      if (!isValidEmail(emails[i])) {
        Alert.alert("Invalid Email", `Please enter a valid email for seat ${i + 1}`);
        return;
      }
    }
    setLoading(true);
    await onSubmit(emails);
    setLoading(false);
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View
          style={{
            flex: 1,
            justifyContent: "center",
            backgroundColor: "rgba(0,0,0,0.4)",
          }}
        >
          <View
            style={{
              backgroundColor: "#fff",
              padding: 20,
              marginHorizontal: 20,
              borderRadius: 10,
              maxHeight: "80%",
            }}
          >
            <Text style={{ fontSize: 18, fontWeight: "600", marginBottom: 10 }}>
              Enter Emails for {seatCount} Seats
            </Text>

            <ScrollView keyboardShouldPersistTaps="handled">
              {emails.map((email, index) => (
                <EmailInput
                  key={index}
                  index={index}
                  value={email}
                  onChange={handleEmailChange}
                />
              ))}
            </ScrollView>

            <TouchableOpacity
              style={{
                backgroundColor: "#7aa33d",
                borderRadius: 8,
                paddingVertical: 14,
                marginTop: 10,
                alignItems: "center",
              }}
              onPress={handleSubmit}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={{ color: "#fff", fontSize: 16 }}>Submit Emails</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

export default memo(EmailModal);
