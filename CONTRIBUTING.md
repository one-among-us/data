
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
  * `info.yml`: Profile information
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

`/data/hdata.json` defines metadata for controlling entry behavior and display properties. Here is a description of each field:

* `commentOnly`: `string[]`, entries that contain only comments without full profile pages (e.g., `tdor` or `tdov`)
* `exclude`: `string[]`, directories that will be excluded from the build process entirely
* `notShowOnHome`: `string[]`, entries that exist but are hidden from the home page listing
* `actualHide`: `string[]`, entries completely hidden from both home page and random navigation.  
  Note: If an entry is in this list, you don't need to add it to `notShowOnHome` again.
* `trigger`: `string[]`, entries with potentially triggering content that require content warnings and user confirmation before viewing
* `switch`: `[string, string][]`, paired entries for profile switching functionality. Each pair `[A, B]` allows switching from profile A to profile B.
* `skipAges`: `string[]`, entries where age calculation should be skipped
* `probabilities`: `object`, probability weights for displaying entries on the home page. Format: `{"entry_id": probability_value}`. Values between 0.0-1.0 control random display chance. Entries not in this object are always shown.
* `groups`: `string[][]`, groups of entries that should be displayed together when sorted. Each group is an array of entry IDs. Members within a group are sorted by their sortKey, and groups are positioned based on the latest sortKey among their members.

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
    ],
    "switch": [
        ["profile_a", "profile_b"]
    ],
    "skipAges": [
        "example_entry"
    ],
    "probabilities": {
        "XingZ60": 1,
        "Huasheng": 0.5
    },
    "groups": [
        ["Elihuso", "Anilovr"]
    ]
}
```

## 4. MDX external features

1. Both `{/*something*/}` and `<!--something-->` can be rendered as comment, will not displayed on the website;
2. KaTeX formula could be used in the page. eg. `$C_p=\dfrac{p-p_\infty}{\frac12\rho U_\infty^2}$` as $C_p=\dfrac{p-p_\infty}{\frac12\rho U_\infty^2}$
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
    <BlurBlock>
    this is an example blurred paragraph.
    </BlurBlock>
    ```
* `CapDownQuote`
  * usage: `<CapDownQuote messages={string[][]} />`
    * messages: `string[][]`, the message of quote block.
  * example: `<blockquote><CapDownQuote messages={[["你走了呀……姊姊……”", "“这个天线的馈线那些怎么看来着？”"], ["“不上学了嘛……”", "“不是说好了下一次……”"], ["“山猫猫！抱住~”", "“她听力不太好哦……”"], ["“为什么……”", "“把我们丢在这……”"], ["“这是为了她……”", "“下一次一起打mai……”"], ["“教我开车嘛~”", "“帮我照顾好山猫猫~“"], ["“姊姊好厉害，好羡慕……”", "“又被家里人说了，公司的工作也很多……”"]]} /></blockquote>`
* `TextRing`
  * usage: `<TextRing text="" />`
    * text: `string`, the text you want display
* `DottedNumber`
  * usage: `<DottedNumber n="" />` OR `<DottedNumber n={number}`
    * n: `string|number`, the number you want to display.

## 6. Punctuations

* In zh_hans/zh_hant pages, we prefer to use these punctuations: `，。？！:;——()[]{}「」『』《》`
* In en_ca pages, we prefer to use these punctuations: `,.?!:;-()[]{}“”‘’<>`
