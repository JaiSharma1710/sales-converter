# Jammu & Kashmir orders में आ रही error: कारण और समाधान

## समस्या क्या थी

FBA Sales Report (17-08-2026 से 29-08-2026) upload करते समय **Uttar Pradesh (WM0B6)** के 2 orders पर यह error आ रही थी:

> Multiple customer mappings found for WM0B6 + JAMMU & KASHMIR

इस error की वजह से उस state की file download नहीं हो पा रही थी।

## ऐसा क्यों हो रहा था

- हर order के लिए system यह देखता है कि माल **किस warehouse से** गया और **किस state में** गया। इन दोनों के आधार पर वह सही customer code चुनता है।
- हमारी customer list में UP warehouse के लिए "JAMMU & KASHMIR" state के सामने **दो customer** लिखे हुए थे:
  - **WCJKF00023**: Jammu and Kashmir का customer
  - **WCJKF00024**: Ladakh का customer, जिसकी state भी गलती से "JAMMU & KASHMIR" लिखी हुई थी
- दो customer मिलने पर system तय नहीं कर पा रहा था कि कौन सा सही है। गलत customer में entry न हो जाए, इसलिए उसने order रोककर error दिखाई।
- यही गलती **Delhi, West Bengal और Karnataka** warehouses की list में भी थी, इसलिए वहाँ भी आगे यही error आ सकती थी।

**Excel file में कोई गलती नहीं थी।** गलती customer list में थी।

## क्या ठीक किया गया

Ladakh वाले customers की state **"JAMMU & KASHMIR" से बदलकर "LADAKH"** कर दी गई है। यह बदलाव चारों warehouses के लिए किया गया है:

| Warehouse | Ladakh customer |
|---|---|
| Uttar Pradesh (WM0B6) | WCJKF00024 |
| Delhi (WM0C4) | WCJKF00011 |
| West Bengal (WM0A6) | WCJKF00015 |
| Karnataka (WM0A5) | WCJKF00012 |

किसी भी customer code या tax setting में कोई बदलाव नहीं किया गया है।

## अब क्या होगा

- Jammu & Kashmir जाने वाले orders अपने आप **J&K customer** में जाएँगे। Uttar Pradesh के लिए यह **WCJKF00023** है।
- अगर Amazon की report में कभी state "LADAKH" आती है, तो वे orders **Ladakh customer** में जाएँगे।
- Uttar Pradesh की file अब बिना error के download हो जाएगी।

## ध्यान देने वाली बात

Amazon अपनी report में **Ladakh की deliveries को भी "JAMMU & KASHMIR" ही लिखता है।** Report में city या pincode नहीं होता, इसलिए Leh या Kargil जाने वाले orders भी **J&K customer** में ही book होंगे।

अगर Ladakh की sales अलग दिखानी ज़रूरी हैं, तो बताइए। इसके लिए Amazon की report में pincode वाला column चाहिए होगा।
