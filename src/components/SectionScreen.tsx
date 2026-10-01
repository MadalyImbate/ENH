import React from 'react';
import { SafeAreaView, StatusBar, Text, View } from 'react-native';
import { styles } from '../styles/styles';

type SectionScreenProps = {
  title: string;
  description: string;
};

export function SectionScreen({ title, description }: SectionScreenProps) {
  return (
    <SafeAreaView style={styles.homeRoot}>
      <StatusBar barStyle="light-content" backgroundColor="#12160f" />
      <View style={styles.contentArea}>
        <Text style={styles.screenTitle}>{title}</Text>
        <Text style={styles.screenDescription}>{description}</Text>
      </View>
    </SafeAreaView>
  );
}
