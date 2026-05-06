const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Face = require('./models/Face');
const PersonCluster = require('./models/PersonCluster');

dotenv.config({ path: './.env' });

async function check() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        const clusters = await PersonCluster.find().sort({ createdAt: -1 }).limit(10);
        console.log(`Found ${clusters.length} recent clusters.`);
        
        for (const cluster of clusters) {
            const faces = await Face.find({ personClusterId: cluster._id });
            console.log(`Cluster ${cluster.clusterId}: ${faces.length} faces, ${cluster.photoIds.length} photos`);
        }
    } catch (err) {
        console.error(err);
    } finally {
        await mongoose.disconnect();
    }
}

check();
