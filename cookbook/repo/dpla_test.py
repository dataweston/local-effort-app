import os, requests
url = 'https://api.dp.la/v2/items'
params = {
    'page': 1,
    'page_size': 1,
    'sourceResource.type': 'text',
    'sourceResource.subject.name': 'church|parish|ladies aid|auxiliary|guild|ptsa|pta|women\'s club|lodge|grange|school|4-h|lutheran|catholic|methodist|synagogue|temple|county historical society|garden club',
    'sourceResource.spatial.name': 'Hennepin County',
    'q': '(sourceResource.title:(cookbook OR "cook book" OR recipe OR recipes OR cookery OR cooking OR "home economics" OR "community cookbook") OR sourceResource.description:(cookbook OR "cook book" OR recipe OR recipes OR cookery OR cooking OR "home economics" OR "community cookbook")) -diet -microwave -corporate -"weight loss" -advertising -dietetic',
    'api_key': os.environ['DPLA_API_KEY'],
}
r = requests.get(url, params=params, timeout=30)
print(r.status_code)
print(r.text[:500])
