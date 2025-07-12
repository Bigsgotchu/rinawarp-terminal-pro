import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
  StatusBar,
  SafeAreaView,
  Modal,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { RinaWarpSDK } from '@rinawarp/terminal-sdk';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LineChart } from 'react-native-chart-kit';

const API_KEY_STORAGE = '@rinawarp_api_key';
const API_URL = 'https://api.rinawarp.com';

export default function App() {
  const [sdk, setSdk] = useState(null);
  const [terminals, setTerminals] = useState([]);
  const [metrics, setMetrics] = useState({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [connected, setConnected] = useState(false);
  const [alerts, setAlerts] = useState([]);

  useEffect(() => {
    initializeApp();
  }, []);

  const initializeApp = async () => {
    try {
      const storedApiKey = await AsyncStorage.getItem(API_KEY_STORAGE);
      if (storedApiKey) {
        await setupSDK(storedApiKey);
      } else {
        setShowApiKeyModal(true);
      }
    } catch (error) {
      console.error('Failed to initialize app:', error);
    }
  };

  const setupSDK = async key => {
    try {
      const newSdk = new RinaWarpSDK({
        apiKey: key,
        apiUrl: API_URL,
      });

      // Set up event listeners
      newSdk.on('connect', () => {
        setConnected(true);
        console.log('Connected to RinaWarp API');
      });

      newSdk.on('disconnect', () => {
        setConnected(false);
        console.log('Disconnected from RinaWarp API');
      });

      newSdk.on('error', error => {
        console.error('SDK Error:', error);
        Alert.alert('Connection Error', error.message);
      });

      setSdk(newSdk);
      setApiKey(key);
      await AsyncStorage.setItem(API_KEY_STORAGE, key);

      // Connect and load initial data
      await newSdk.connect();
      await loadTerminals(newSdk);
      await subscribeToAlerts(newSdk);

      setLoading(false);
      setShowApiKeyModal(false);
    } catch (error) {
      console.error('Failed to setup SDK:', error);
      Alert.alert('Setup Error', error.message);
      setShowApiKeyModal(true);
    }
  };

  const loadTerminals = async (sdkInstance = sdk) => {
    try {
      const terminalList = await sdkInstance.getTerminals();
      setTerminals(terminalList);

      // Load metrics for each terminal
      const metricsPromises = terminalList.map(async terminal => {
        try {
          const terminalMetrics = await sdkInstance.getPerformanceMetrics(terminal.id, {
            start: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
            end: new Date().toISOString(),
          });
          return { [terminal.id]: terminalMetrics };
        } catch (error) {
          console.error(`Failed to load metrics for ${terminal.id}:`, error);
          return { [terminal.id]: null };
        }
      });

      const metricsResults = await Promise.all(metricsPromises);
      const metricsMap = metricsResults.reduce((acc, curr) => ({ ...acc, ...curr }), {});
      setMetrics(metricsMap);
    } catch (error) {
      console.error('Failed to load terminals:', error);
      Alert.alert('Load Error', 'Failed to load terminals');
    }
  };

  const subscribeToAlerts = async (sdkInstance = sdk) => {
    try {
      await sdkInstance.subscribeToPerformanceAlerts(alert => {
        setAlerts(prev => [alert, ...prev.slice(0, 49)]); // Keep last 50 alerts

        // Show critical alerts immediately
        if (alert.severity === 'critical') {
          Alert.alert('Critical Alert', `${alert.message}\nTerminal: ${alert.terminalId}`, [
            { text: 'OK' },
          ]);
        }
      });
    } catch (error) {
      console.error('Failed to subscribe to alerts:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadTerminals();
    setRefreshing(false);
  };

  const executeCommand = async (terminalId, command) => {
    try {
      const result = await sdk.executeCommand(terminalId, command);
      Alert.alert('Command Executed', `Exit Code: ${result.exitCode}\nOutput: ${result.output}`, [
        { text: 'OK' },
      ]);
    } catch (error) {
      Alert.alert('Command Error', error.message);
    }
  };

  const createTerminal = async name => {
    try {
      await sdk.createTerminal(name);
      await loadTerminals();
      Alert.alert('Success', 'Terminal created successfully');
    } catch (error) {
      Alert.alert('Create Error', error.message);
    }
  };

  const deleteTerminal = async terminalId => {
    Alert.alert('Delete Terminal', 'Are you sure you want to delete this terminal?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await sdk.deleteTerminal(terminalId);
            await loadTerminals();
            Alert.alert('Success', 'Terminal deleted successfully');
          } catch (error) {
            Alert.alert('Delete Error', error.message);
          }
        },
      },
    ]);
  };

  const renderTerminalCard = terminal => (
    <View key={terminal.id} style={styles.terminalCard}>
      <View style={styles.terminalHeader}>
        <Text style={styles.terminalName}>{terminal.name}</Text>
        <View
          style={[
            styles.statusIndicator,
            { backgroundColor: terminal.status === 'active' ? '#4CAF50' : '#FF9800' },
          ]}
        />
      </View>

      <Text style={styles.terminalId}>ID: {terminal.id}</Text>
      <Text style={styles.terminalDate}>
        Created: {new Date(terminal.createdAt).toLocaleDateString()}
      </Text>

      {metrics[terminal.id] && (
        <View style={styles.metricsContainer}>
          <Text style={styles.metricsTitle}>Performance Metrics</Text>
          <View style={styles.metricsRow}>
            <View style={styles.metricItem}>
              <Text style={styles.metricValue}>
                {metrics[terminal.id].responseTime?.toFixed(1)}ms
              </Text>
              <Text style={styles.metricLabel}>Response Time</Text>
            </View>
            <View style={styles.metricItem}>
              <Text style={styles.metricValue}>{metrics[terminal.id].cpuUsage?.toFixed(1)}%</Text>
              <Text style={styles.metricLabel}>CPU Usage</Text>
            </View>
            <View style={styles.metricItem}>
              <Text style={styles.metricValue}>
                {(metrics[terminal.id].memoryUsage / 1024)?.toFixed(1)}GB
              </Text>
              <Text style={styles.metricLabel}>Memory</Text>
            </View>
          </View>
        </View>
      )}

      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[styles.button, styles.primaryButton]}
          onPress={() => executeCommand(terminal.id, 'ls -la')}
        >
          <Text style={styles.buttonText}>Run ls -la</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.button, styles.dangerButton]}
          onPress={() => deleteTerminal(terminal.id)}
        >
          <Text style={styles.buttonText}>Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderAlert = (alert, index) => (
    <View key={index} style={[styles.alertCard, styles[`${alert.severity}Alert`]]}>
      <Text style={styles.alertTitle}>{alert.title}</Text>
      <Text style={styles.alertMessage}>{alert.message}</Text>
      <Text style={styles.alertTime}>{new Date(alert.timestamp).toLocaleTimeString()}</Text>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2196F3" />
        <Text style={styles.loadingText}>Loading RinaWarp Monitor...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1976D2" />

      <View style={styles.header}>
        <Text style={styles.headerTitle}>RinaWarp Monitor</Text>
        <View style={styles.headerInfo}>
          <View
            style={[
              styles.connectionStatus,
              { backgroundColor: connected ? '#4CAF50' : '#F44336' },
            ]}
          />
          <Text style={styles.headerText}>{terminals.length} Terminals</Text>
        </View>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <TouchableOpacity
            style={[styles.actionButton, styles.primaryButton]}
            onPress={() => {
              Alert.prompt(
                'Create Terminal',
                'Enter terminal name:',
                name => name && createTerminal(name)
              );
            }}
          >
            <Text style={styles.buttonText}>Create Terminal</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, styles.secondaryButton]}
            onPress={() => setShowApiKeyModal(true)}
          >
            <Text style={styles.buttonText}>Settings</Text>
          </TouchableOpacity>
        </View>

        {/* Alerts Section */}
        {alerts.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Recent Alerts</Text>
            {alerts.slice(0, 3).map(renderAlert)}
          </View>
        )}

        {/* Terminals Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Terminals</Text>
          {terminals.length > 0 ? (
            terminals.map(renderTerminalCard)
          ) : (
            <Text style={styles.emptyText}>No terminals found. Create one to get started.</Text>
          )}
        </View>
      </ScrollView>

      {/* API Key Modal */}
      <Modal visible={showApiKeyModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>RinaWarp API Key</Text>
            <TextInput
              style={styles.input}
              value={apiKey}
              onChangeText={setApiKey}
              placeholder="Enter your API key"
              secureTextEntry
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.button, styles.primaryButton]}
                onPress={() => apiKey && setupSDK(apiKey)}
              >
                <Text style={styles.buttonText}>Save</Text>
              </TouchableOpacity>
              {sdk && (
                <TouchableOpacity
                  style={[styles.button, styles.secondaryButton]}
                  onPress={() => setShowApiKeyModal(false)}
                >
                  <Text style={styles.buttonText}>Cancel</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 20,
    fontSize: 16,
    color: '#666',
  },
  header: {
    backgroundColor: '#1976D2',
    padding: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    color: 'white',
    fontSize: 24,
    fontWeight: 'bold',
  },
  headerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  connectionStatus: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 10,
  },
  headerText: {
    color: 'white',
    fontSize: 16,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  quickActions: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  actionButton: {
    flex: 1,
    marginHorizontal: 5,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#333',
  },
  terminalCard: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  terminalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  terminalName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  statusIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  terminalId: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  terminalDate: {
    fontSize: 12,
    color: '#999',
    marginBottom: 15,
  },
  metricsContainer: {
    marginBottom: 15,
  },
  metricsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  metricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  metricItem: {
    alignItems: 'center',
  },
  metricValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2196F3',
  },
  metricLabel: {
    fontSize: 12,
    color: '#666',
  },
  buttonContainer: {
    flexDirection: 'row',
  },
  button: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 5,
  },
  primaryButton: {
    backgroundColor: '#2196F3',
  },
  secondaryButton: {
    backgroundColor: '#666',
  },
  dangerButton: {
    backgroundColor: '#F44336',
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 14,
  },
  alertCard: {
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
    borderLeftWidth: 4,
  },
  criticalAlert: {
    backgroundColor: '#ffebee',
    borderLeftColor: '#f44336',
  },
  warningAlert: {
    backgroundColor: '#fff3e0',
    borderLeftColor: '#ff9800',
  },
  infoAlert: {
    backgroundColor: '#e3f2fd',
    borderLeftColor: '#2196f3',
  },
  alertTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  alertMessage: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  alertTime: {
    fontSize: 12,
    color: '#999',
  },
  emptyText: {
    textAlign: 'center',
    color: '#666',
    fontSize: 16,
    marginTop: 20,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 20,
    margin: 20,
    width: '90%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
    fontSize: 16,
  },
  modalButtons: {
    flexDirection: 'row',
  },
});
