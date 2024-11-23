
# How to contribute

## 0. Write Commit Messages

Effective Feb 20, 2023, we adopt the commit message convention as follows for all One Among Us repositories:

> [*] Do something

The message should be written in English. Starting with a mark symbol in square brackets and separated by a space character, the headline should be a imperative sentence describing what you do and end without punctuation marks. Detailed descriptions are not mandatory but recommended if you find it complicated. We follow the 72-column line-wrapping rule.

### Marks

> [+] Add
>
> [-] Remove
>
> [U] Update
>
> [O] Optimize
>
> [F] Fix
>
> [S] Modify style
>
> [M] Move (also [M] Modify by convention but [U] Modify is recommended)
>
> [R] Refactor
>
> [T] Test
>
> [D] Tweak documentation
>
> [B] Backup
>
> [PR] Merge commit of pull request

### Examples

> [+] Add entry for sauricat
>
> [U] Update photos for sauricat
>
> [F] Fix punctuation

## 1. File structures

* Directory `/people/<userid>/`: Data for a specific person
  * `info.yaml`: Profile information
  * `page.md`: Profile page content
    * `page.en.md`: English version for page content
    * `page.zh_hant.md`: Traditional Chinese version for page content
  * `photos`: Photo directory
  * `comments`: List of comments made by other users in the format of `yyyy-mm-dd-{name}-{id}.txt`
* Directory `/data/`: Data for building
  * `hdata.json`: Front-end item behavior, see [HData chapter](#3-hdata)
  * `eggs.json`: Easter Eggs. Please contact the maintainer to add new easter egg(s).
* Directory `/scripts/`: Build Scripts

## 2. How to build/preview

```sh
# Install Dependencies
yarn install

# Build data
yarn build

# Preview Website
yarn preview
```

For Windows, Yarn could be find at [Classic YarnPkg](https://classic.yarnpkg.com/lang/en/docs/install/#debian-stable).

## 3. HData

`/data/hdata.json` defined some data which used for entry properties. Here is some description of it:

* `commentOnly`: `string[]`, the entries which include comments only, like `tdor` or `tdov`
* `exclude`: `string[]`, the directories which would not be handled
* `notShowOnHome`: `string[]`, if you don't want a entry show on the home, add it into this item
* `actualHide`: `string[]`, if you don't want a entry show on the home and won't be redirected by random buttons, add it into this item.  
  If you set a entry in this list, you have no need to set it into `notShowOnHome` again.
* `trigger`: `string[]`, if you think this article is likely to irritate readers and should be restricted, please set this option.

### Example

```json
{
    "commentOnly": [
        "tdor"
    ],
    "exclude": [
        "tdov"
    ],
    "notShowOnHome": [
        "Anilovr",
        "noname3031"
    ],
    "actualHide": [
        "ArtsEpiphany"
    ],
    "trigger": [
        "Xu_Yushu"
    ]
}
```

## 4. MDX external features

1. Both `{/*something*/}` and `<!--something-->` can be rendered as comment, will not displayed on the website;
2. KaTeX formula could be used in the page. eg. $C_p=\dfrac{p-p_\infty}{\frac12\rho U_\infty^2}$
3. Footnote could be used.
4. GitHub `[!Note]` mark could be used.

## 5. Components

* `PhotoScroll`
  * usage: `<PhotoScroll photos={string[]} />`
    * `photos`: `string[]`, the photos which this PhotoScroll will displayed
  * example: `<PhotoScroll photos={['${path}/photos/postcard8.jpg', '${path}/photos/postcard9.jpg', '${path}/photos/postcard10.jpg', '${path}/photos/postcard11.jpg',]} />`
* `Banner`
  * usage: `<Banner data={{icon: string, title: string, text: string}} />`
    * `icon`: `string`, the url of icon.
    * `title`: `string`, the title of this banner.
    * `text`: `string`, the description of this banner.
  * example: `<Banner data={{icon: "https://one-among.us/favicon-large.png", title: "本条目含有大量创伤触发要素", text: "如果您在浏览逝者页面的时候产生不适，请立即退出并寻求医生和社群的帮助，必要时寻找当地自杀干预机构。"}} />`
* `BlurBlock`
  * usage: `<BlueBlock hover?>slot</BlueBlock>`
    * `hover`: optional, If specified it will be displayed when the cursor is hovered, not when clicked.
    * `slot` html slot
  * example:
    ```mdx
    <BlueBlock>
    this is an example blurred paragraph.
    </BlueBlock>
    ```
* `CapDownQuote`
  * usage: `<CapDownQuote messages={string[][]} />`
    * messages: `string[][]`, the message of quote block.
  * example: `<blockquote><CapDownQuote messages={[["你走了呀……姊姊……”", "“这个天线的馈线那些怎么看来着？”"], ["“不上学了嘛……”", "“不是说好了下一次……”"], ["“山猫猫！抱住~”", "“她听力不太好哦……”"], ["“为什么……”", "“把我们丢在这……”"], ["“这是为了她……”", "“下一次一起打mai……”"], ["“教我开车嘛~”", "“帮我照顾好山猫猫~“"], ["“姊姊好厉害，好羡慕……”", "“又被家里人说了，公司的工作也很多……”"]]} /></blockquote>`
