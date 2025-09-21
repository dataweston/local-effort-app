from parsers.recipe_extractor import parse_recipes_from_text

def test_basic_recipe_parsing():
    text = """
    CHOCOLATE CHIP COOKIES
    1 cup sugar
    2 tbsp butter
    1 tsp vanilla
    Mix ingredients. Bake 10 minutes.

    PANCAKES
    • 1 cup flour
    • 2 tsp baking powder
    Whisk and cook on griddle.
    """
    recipes = parse_recipes_from_text(text)
    assert len(recipes) == 2
    assert recipes[0]['title'].lower().startswith('chocolate chip')
    assert any('1 cup sugar' in x.lower() for x in recipes[0]['ingredients'])
    assert any('mix ingredients' in x.lower() for x in recipes[0]['instructions'])
    assert recipes[1]['title'].lower() == 'pancakes'
    assert len(recipes[1]['ingredients']) >= 1


def test_headings_not_treated_as_titles():
    text = """
    FAVORITE BROWNIES
    Ingredients:
    1 cup sugar
    2 eggs
    Directions:
    Mix together and bake.
    """

    recipes = parse_recipes_from_text(text)
    assert len(recipes) == 1
    recipe = recipes[0]
    assert recipe['title'] == 'FAVORITE BROWNIES'
    assert any('1 cup sugar' in step for step in recipe['ingredients'])
    assert any('mix together' in step.lower() for step in recipe['instructions'])
