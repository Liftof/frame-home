/* Optional France example profile; channel numbers can change by region and date. */
window.FrameChannels = FrameConfig.channelProfile==='fr-tvplus' ? [
  {
    "id": "aljazeera",
    "name": "Al Jazeera English",
    "provider": "tvplus",
    "major": 4564,
    "section": "english",
    "providerChannelId": "FR23000013B"
  },
  {
    "id": "cnn-headlines",
    "name": "CNN Headlines",
    "provider": "tvplus",
    "major": 4569,
    "section": "english",
    "providerChannelId": "FRBD190001055"
  },
  {
    "id": "sky-news",
    "name": "Sky News",
    "provider": "tvplus",
    "major": 4571,
    "section": "english",
    "providerChannelId": "FR3400002VW"
  },
  {
    "id": "reuters",
    "name": "Reuters",
    "provider": "tvplus",
    "major": 4573,
    "section": "english",
    "providerChannelId": "FRBD490000195"
  },
  {
    "id": "bloomberg",
    "name": "Bloomberg TV+",
    "provider": "tvplus",
    "major": 4574,
    "section": "english",
    "providerChannelId": "FR1400004VF"
  },
  {
    "id": "bfm",
    "name": "BFM TV",
    "provider": "tvplus",
    "major": 4002,
    "section": "french",
    "providerChannelId": "FRBD410000783"
  },
  {
    "id": "france-tv5-info",
    "name": "TV5MONDE Info",
    "provider": "tvplus",
    "major": 4561,
    "section": "french",
    "providerChannelId": "FR1800005X0"
  },
  {
    "id": "euronews",
    "name": "Euronews",
    "provider": "tvplus",
    "major": 4560,
    "section": "french",
    "providerChannelId": "FR2600004SS"
  }
] : [];
