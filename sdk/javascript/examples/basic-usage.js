import { RinaWarpSDK } from '@rinawarp/terminal-sdk';

// Basic usage example
const basicExample = async () => {
  const sdk = new RinaWarpSDK({
    apiKey: 'your-api-key-here',
    apiUrl: 'https://api.rinawarp.com',
  });

  try {
    // Create a terminal
    const terminal = await sdk.createTerminal('My Terminal');
    console.log('Terminal created:', terminal);

    // Execute a command
    const result = await sdk.executeCommand(terminal.id, 'echo "Hello World"');
    console.log('Command result:', result);

    // Get terminal list
    const terminals = await sdk.getTerminals();
    console.log('All terminals:', terminals);

    // Subscribe to real-time updates
    const unsubscribe = await sdk.subscribeToTerminal(terminal.id, message => {
      console.log('Terminal update:', message);
    });

    // Stream command output
    await sdk.streamCommand(terminal.id, 'ls -la', output => {
      console.log('Stream output:', output);
    });

    // Clean up
    unsubscribe();
    await sdk.deleteTerminal(terminal.id);
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await sdk.disconnect();
  }
};

// Performance monitoring example
const performanceExample = async () => {
  const sdk = new RinaWarpSDK({
    apiKey: 'your-api-key-here',
  });

  try {
    // Get performance metrics
    const metrics = await sdk.getPerformanceMetrics('terminal-id', {
      start: '2024-01-01T00:00:00Z',
      end: '2024-01-31T23:59:59Z',
    });
    console.log('Performance metrics:', metrics);

    // Subscribe to performance alerts
    await sdk.subscribeToPerformanceAlerts(alert => {
      console.log('Performance alert:', alert);
    });

    // Get user analytics
    const userAnalytics = await sdk.getUserAnalytics();
    console.log('User analytics:', userAnalytics);
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await sdk.disconnect();
  }
};

// Event handling example
const eventsExample = async () => {
  const sdk = new RinaWarpSDK({
    apiKey: 'your-api-key-here',
  });

  // Set up event listeners
  sdk.on('connect', () => {
    console.log('Connected to RinaWarp API');
  });

  sdk.on('disconnect', () => {
    console.log('Disconnected from RinaWarp API');
  });

  sdk.on('error', error => {
    console.error('SDK Error:', error);
  });

  try {
    await sdk.connect();

    // Your application logic here
  } catch (error) {
    console.error('Connection error:', error);
  }
};

// Batch operations example
const batchExample = async () => {
  const sdk = new RinaWarpSDK({
    apiKey: 'your-api-key-here',
  });

  try {
    const operations = [
      { method: 'GET', endpoint: '/api/terminal' },
      { method: 'POST', endpoint: '/api/terminal', body: { name: 'Batch Terminal' } },
    ];

    const results = await sdk.batch(operations);
    console.log('Batch results:', results);
  } catch (error) {
    console.error('Batch error:', error.message);
  }
};

// GraphQL example
const graphqlExample = async () => {
  const sdk = new RinaWarpSDK({
    apiKey: 'your-api-key-here',
  });

  try {
    const query = `
      query GetTerminals($limit: Int) {
        terminals(limit: $limit) {
          id
          name
          status
          createdAt
        }
      }
    `;

    const result = await sdk.graphql(query, { limit: 10 });
    console.log('GraphQL result:', result);
  } catch (error) {
    console.error('GraphQL error:', error.message);
  }
};

// Run examples
if (import.meta.url === `file://${process.argv[1]}`) {
  console.log('Running basic example...');
  basicExample();

  console.log('Running performance example...');
  performanceExample();

  console.log('Running events example...');
  eventsExample();

  console.log('Running batch example...');
  batchExample();

  console.log('Running GraphQL example...');
  graphqlExample();
}
