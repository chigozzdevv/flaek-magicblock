import 'dotenv/config'
import { connectMongo } from '@/db/mongo'

async function main() {
  await connectMongo()
  // eslint-disable-next-line no-console
  console.log('Job worker not required for MagicBlock plans')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
