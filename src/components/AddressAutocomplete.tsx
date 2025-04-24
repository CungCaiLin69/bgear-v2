// components/AddressAutocomplete.tsx
import React, { useState, useEffect } from 'react';
import { View, TextInput, FlatList, TouchableOpacity, Text, ActivityIndicator, StyleSheet } from 'react-native';

interface Props {
  value: string;
  onSelect: (label: string, coords: { lat: string; lon: string }) => void;
  placeholder?: string;
  apiKey: string;
}

const AddressAutocomplete: React.FC<Props> = ({ value, onSelect, placeholder = 'Search location', apiKey }) => {
  const [query, setQuery] = useState(value);
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (query.length < 3) {
      setResults([]);
      return;
    }

    const timeout = setTimeout(() => {
      fetchSuggestions(query);
    }, 300);

    return () => clearTimeout(timeout);
  }, [query]);

  const fetchSuggestions = async (text: string) => {
    setLoading(true);
    try {
      const response = await fetch(
        `https://api.locationiq.com/v1/autocomplete?key=${apiKey}&q=${encodeURIComponent(text)}&limit=5&format=json`
      );
      const data = await response.json();
      setResults(data);
    } catch (error) {
      console.error('LocationIQ Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (item: any) => {
    onSelect(item.display_name, { lat: item.lat, lon: item.lon });
    setQuery(item.display_name);
    setResults([]);
  };

  return (
    <View style={styles.container}>
      <TextInput
        value={query}
        onChangeText={setQuery}
        placeholder={placeholder}
        style={styles.input}
      />
      {loading && <ActivityIndicator size="small" />}
      <FlatList
        data={results}
        keyExtractor={(item) => item.place_id.toString()}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.item} onPress={() => handleSelect(item)}>
            <Text>{item.display_name}</Text>
          </TouchableOpacity>
        )}
        style={styles.list}
      />
    </View>
  );
};

export default AddressAutocomplete;

const styles = StyleSheet.create({
  container: {
    zIndex: 1000,
  },
  input: {
    height: 48,
    borderColor: '#ccc',
    borderWidth: 1,
    paddingHorizontal: 10,
    borderRadius: 6,
    fontSize: 16,
  },
  list: {
    backgroundColor: '#fff',
    maxHeight: 150,
    borderWidth: 1,
    borderColor: '#ccc',
    borderTopWidth: 0,
    marginTop: 2,
    borderRadius: 6,
  },
  item: {
    padding: 10,
    borderBottomWidth: 1,
    borderColor: '#eee',
  },
});

