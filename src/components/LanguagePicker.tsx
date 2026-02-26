import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Modal,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Language } from '../types';

type Props = {
  visible: boolean;
  languages: Language[];
  selectedCode: string;
  title: string;
  onSelect: (code: string) => void;
  onClose: () => void;
};

export default function LanguagePicker({
  visible,
  languages,
  selectedCode,
  title,
  onSelect,
  onClose,
}: Props) {
  const renderItem = ({ item }: { item: Language }) => {
    const isSelected = item.code === selectedCode;

    return (
      <TouchableOpacity
        style={[styles.item, isSelected && styles.itemSelected]}
        onPress={() => onSelect(item.code)}
      >
        <View style={styles.itemContent}>
          <Text style={[styles.nativeName, isSelected && styles.nameSelected]}>
            {item.nativeName}
          </Text>
          <Text style={styles.name}>{item.name}</Text>
        </View>
        {isSelected && (
          <Ionicons name="checkmark-circle" size={22} color="#e94560" />
        )}
      </TouchableOpacity>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <TouchableOpacity style={styles.overlay} onPress={onClose} activeOpacity={1}>
        <TouchableOpacity
          style={styles.sheet}
          activeOpacity={1}
          onPress={(e) => e.stopPropagation()}
        >
          {/* Handle bar */}
          <View style={styles.handle} />

          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#8892a4" />
            </TouchableOpacity>
            <Text style={styles.title}>{title}</Text>
            <View style={{ width: 40 }} />
          </View>

          {/* List */}
          <FlatList
            data={languages}
            keyExtractor={(item) => item.code}
            renderItem={renderItem}
            showsVerticalScrollIndicator={false}
            style={styles.list}
          />
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#16213e',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '70%',
    paddingBottom: 32,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: '#8892a4',
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#0f3460',
  },
  closeButton: {
    padding: 4,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: '#ffffff',
  },
  list: {
    flex: 1,
  },
  item: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#0f3460',
  },
  itemSelected: {
    backgroundColor: '#0f3460',
  },
  itemContent: {
    flex: 1,
    alignItems: 'flex-end',
  },
  nativeName: {
    fontSize: 16,
    color: '#ffffff',
    fontWeight: '500',
  },
  nameSelected: {
    color: '#e94560',
  },
  name: {
    fontSize: 13,
    color: '#8892a4',
    marginTop: 2,
  },
});
