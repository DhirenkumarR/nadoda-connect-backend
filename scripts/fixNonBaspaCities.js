import 'dotenv/config';
import { connectDB } from '../config/db.js';
import { Village, Family } from '../models/index.js';

const run = async () => {
    await connectDB();
    const villages = await Village.find();
    for (const v of villages) {
        if (v.name.en !== 'Baspa') {
            const res = await Family.updateMany(
                { villageId: v._id, 'address.currentCity.gu': 'બાસ્પા' },
                {
                    $set: {
                        'address.currentCity.gu': v.name.gu,
                        'address.currentCity.en': v.name.en
                    }
                }
            );
            console.log(`Updated village ${v.name.gu} (${v.name.en}) families count: ${res.modifiedCount}`);
        }
    }
    process.exit(0);
};

run();
