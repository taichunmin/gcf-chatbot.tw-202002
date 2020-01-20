const _ = require('lodash')
const Line = require('@line/bot-sdk').Client
const JSON5 = require('json5')

const errToString = err => {
  const debug = {}
  _.each([
    'args',
    'code',
    'message',
    'name',
    'raw',
    'stack',
    'status',
    'statusCode',
    'statusMessage',
  ], key => {
    if (_.hasIn(err, key)) _.set(debug, key, _.get(err, key))
  })
  return JSON.stringify(debug)
}

const messageText = text => {
  text = _.truncate(_.toString(text), {
    length: 2000
  })
  return {
    type: 'text',
    text
  }
}

/**
 * Responds to any HTTP request.
 *
 * @param {!express:Request} req HTTP request context.
 * @param {!express:Response} res HTTP response context.
 */
exports.main = async (req, res) => {
  try {
    // get access token
    const channelAccessToken = req.path.substring(1)
    if (!/^[a-zA-Z0-9+/=]+$/.test(channelAccessToken)) throw new Error('wrong channel access token')
    const line = new Line({ channelAccessToken })

    const events = _.get(req, 'body.events', [])
    await Promise.all(_.map(events, async event => {
      let messages
      try {
        if (_.get(event, 'message.type') === 'text') { // 如果是 JSON 就嘗試回傳
          try {
            const tmp = JSON5.parse(_.get(event, 'message.text'))
            if (_.hasIn(tmp, 'type')) messages = JSON5.parse(_.get(event, 'message.text'))
          } catch (err) {
            console.log(errToString(err))
          }
        }
        if (!messages) { // 其他類型就直接把 event 轉成 JSON
          messages = messageText(JSON.stringify(event))
        }
        console.log(JSON.stringify({ event, messages }))
        await line.replyMessage(event.replyToken, messages)
      } catch (err) {
        console.log(errToString(err))
      }
    }))
    res.status(200).send('OK')
  } catch (err) {
    console.log(errToString(err))
    res.status(err.status || 500).send(err.message)
  }
}
