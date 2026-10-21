# Corpus provenance

Downloaded on 21 October 2026. Language: English. The full UTF-8 files retain their original Project Gutenberg copyright and license notices. Jane Austen (died 1817) and Arthur Conan Doyle (died 1930) wrote the original works, which are public domain in the US and Italy. Gutenberg's included license governs use of its name and distribution of its eBook files; retain the notices.

| Role | Work | Source | Raw bytes | Prepared A–Z letters |
| --- | --- | --- | ---: | ---: |
| Training only | Jane Austen, Pride and Prejudice | https://www.gutenberg.org/ebooks/1342 | 772,386 | 538,224 |
| Testing only | Arthur Conan Doyle, The Adventures of Sherlock Holmes | https://www.gutenberg.org/ebooks/1661 | 607,606 | 431,069 |

Direct source files: https://www.gutenberg.org/cache/epub/1342/pg1342.txt and https://www.gutenberg.org/cache/epub/1661/pg1661.txt . The bundled exact snapshots are authoritative for reproduction; upstream editions may change.

## Preparation

Implemented in `js/core.js`, function `body`: remove text outside START/END Gutenberg markers. Start the training text at “It is a truth universally acknowledged”; start test text at “To Sherlock Holmes she is always”. This excludes front matter and tables of contents. Remove bracketed Illustration captions. Convert to uppercase and retain A–Z; remove all other symbols. No paragraph or sentence boundary is enforced during block sampling. Bigram counts include adjacent letters after spaces are removed.

Letter probabilities use add-one smoothing over 26 letters. Bigram joint probabilities use add-one smoothing over 676 pairs. Training and test books are separate; no test data updates either model.

## SHA-256 (original bundled byte streams)

- pg1342.txt: `3f6bb9d6f78e0293b56acd4714dd68cb7d6d1d293402031ce9d5a216bcaf9d75`
- pg1661.txt: `922e2a12ccb43a4c9544c260b2166c6ad2097aeb5957faeee113f173bb857cd0`

The JSON reference report also records hashes computed from the decoded UTF-8 source strings re-encoded by Node. These match the original byte hashes for the included snapshots.

See https://www.gutenberg.org/policy/license.html for the general Gutenberg terms. No third-party API or corpus download is needed when using the bundled site.
