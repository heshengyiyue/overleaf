import { ScriptLog } from '../../app/src/models/ScriptLog.mjs'
import Settings from '@overleaf/settings'

async function beforeScriptExecution(canonicalName, vars, scriptPath) {
  let log = new ScriptLog({
    canonicalName,
    filePathAtVersion: scriptPath,
    podName: process.env.OL_POD_NAME,
    username: process.env.OL_USERNAME,
    imageVersion: process.env.OL_IMAGE_VERSION,
    vars,
  })
  log = await log.save()
  console.log(
    '\n==================================' +
      '\n✨ Your script is running!' +
      '\n📊 Track progress at:' +
      `\n${Settings.adminUrl}/admin/script-log/${log._id}` +
      '\n==================================\n'
  )
  return log._id
}

async function afterScriptExecution(logId, status) {
  await ScriptLog.findByIdAndUpdate(logId, { status, endTime: new Date() })
}

/**
 * @param {(trackProgress: (progress: string) => Promise<void>) => Promise<any>} main - Main function for the script
 * @param {Object} vars - Variables to be used in the script
 * @param {string} canonicalName - The canonical name of the script, default to filename
 * @param {string} scriptPath - The file path of the script, default to process.argv[1]
 * @returns {Promise<void>}
 * @async
 */
export async function scriptRunner(
  main,
  vars = {},
  canonicalName = process.argv[1].split('/').pop().split('.')[0],
  scriptPath = process.argv[1]
) {
  const isSaaS = Boolean(Settings.overleaf)
  if (!isSaaS) {
    await main(async message => {
      console.warn(message)
    })
    return
  }
  const logId = await beforeScriptExecution(canonicalName, vars, scriptPath)

  async function trackProgress(message) {
    try {
      console.warn(message)
      await ScriptLog.findByIdAndUpdate(logId, {
        $push: {
          progressLogs: {
            timestamp: new Date(),
            message,
          },
        },
      })
    } catch (error) {
      console.error('Error tracking progress:', error)
    }
  }

  try {
    await main(trackProgress)
  } catch (error) {
    await afterScriptExecution(logId, 'error')
    throw error
  }

  await afterScriptExecution(logId, 'success')
}
