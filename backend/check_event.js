const mongoose = require('mongoose');
const dotenv = require('dotenv');
const PersonCluster = require('./models/PersonCluster');

dotenv.config({ path: './.env' });

async function check() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        const eventId = '69f89506a378b8353e40b1e3';
        const clusters = await PersonCluster.find({ eventId });
        console.log(`Found ${clusters.length} clusters for event ${eventId}.`);
        for (const cluster of clusters) {
            console.log(`- Cluster ${cluster.clusterId}: ${cluster.photoIds.length} photos`);
        }
    } catch (err) {
        console.error(err);
    } finally {
        await mongoose.disconnect();
    }
}

check();
