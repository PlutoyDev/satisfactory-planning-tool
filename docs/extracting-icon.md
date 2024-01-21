# Extract Icon From Satisfactory

I'm will be using [FModel](https://fmodel.app/) to extract the icon from the game.

## Selecting the game

When you first open FModel, you will be greeted with a screen that looks like this:
![Entry Directory Selector](entry_dir_select.png)

I've installed the game through steam, if you have installed it through the epic games store, it might be detected automatically.

For Steam:

1. Expand the `Add Undetected Game` Section
2. Give it a name
3. Then under directory paste `C:\Program Files (x86)\Steam\steamapps\common\Satisfactory` for steam. If you have installed it somewhere else, you will need to change the path.
4. Click the plus button to add the game.

It should look like this when you are done:

![Selected Directory](selected_dir.png)

Click on the `Ok` button to continue.

## What to extract

Now that we have the game selected, we can select what we want to extract.
Head into the `FactoryGame-Windows.pak` file.
Right click on each of the following files/folders and select `Save Folder's Packages Textures (.png)`

- `FactoryGame/Content/FactoryGame/Resource/Parts`
- `FactoryGame/Content/FactoryGame/Resource/RawResources`
- `FactoryGame/Content/FactoryGame/Buildable`

## Finishing up

Copy the extracted folders into `res/extracted` and you are done!

## Checking the extracted files

If you done everything correctly, you should have a folder structure that looks like this:

```
res
├── extracted
│   ├── FactoryGame
│   │   ├── Content
│   │   │   ├── FactoryGame
│   │   │   │   ├── Buildable
│   │   │   │   │   ├── Factory
│   │   │   │   ├── Resource
│   │   │   │   │   ├── Parts
│   │   │   │   │   └── RawResources
```
