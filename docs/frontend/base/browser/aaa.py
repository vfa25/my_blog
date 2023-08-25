import email
import requests
import json
import re
citys = ['上海']
emails = ['260482267@qq.com', '260482267@qq.com']
resultStr = 'a'
# print(not resultStr)
weather_type_map = {
  '多云': '🌥',
  '晴': '🌞',
  '阴': '☁'
}
print(re.search('(\d)' ,"<![CDATA[级]]>"))
# print((('阴' in weather_type_map) and weather_type_map['阴']) or 'jj')
# def getWeather():
# for (r, j) in enumerate(citys):
#     print(r, j)
      # r = requests.get('http://wthrcdn.etouch.cn/weather_mini?city=上海')
      # data = json.loads(r.text)
      # reqData = data['data']

      # if reqData and isinstance(reqData['forecast'], list):
      #     today = reqData['forecast'][0]
      #     foreverStr = ''
      #     for item in reqData['forecast'][1:]:
      #       foreverStr += '\n{}, {}, {}, {}'.format(item['date'], item['type'], item['high'], item['low'])
      #     resultStr = '''
      #       城市：{}
      #       当前温度: {}℃
      #       当天天气：{}, {}, {}
      #       未来几天：{}
      #     '''.format(reqData['city'], reqData['wendu'], today['type'], today['high'], today['low'], foreverStr)
      #     print(resultStr)
