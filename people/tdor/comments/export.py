import os
import json

md = ''

for dirpath, dirName, fileName in os.walk("./"):
    for f in fileName:
        if f.lower().endswith('.json'):
            with open('./' + f, 'r') as file:
                data = json.load(file)
                md += str(data['content']).replace('\n', '  \n').replace('\\n', '\n\n')
                md += '\n\n'
                md += '——' + str(data['submitter'])
                md += '<br /><br /><br /><br />\n\n'

print(md)
m = open('./export.md', 'w')
m.write(md)
m.close()