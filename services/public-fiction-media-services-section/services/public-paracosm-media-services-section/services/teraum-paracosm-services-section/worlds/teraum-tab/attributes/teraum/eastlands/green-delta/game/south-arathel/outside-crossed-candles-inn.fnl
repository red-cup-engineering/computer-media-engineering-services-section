;;;; outside Crossed Candles Inn, South Arathel (Teraum) model

(local region :teraum/eastlands/green-delta/game/south-arathel/)

{:name "outside the Crossed Candles Inn"
 :base (.. region :rural-road)
 :description "This is the road outside the Crossed Candles Inn, a simple wooden shack with shuttered windows. The road branches toward the other inns of South Arathel and onward toward Bellybrush."
 :exits {:inside (.. region :crossed-candles-inn)
         :southwest (.. region :north-arathel-ack-road)
         :north (.. region :road-near-frekes-grave)
         :south (.. region :outside-golden-shield-inn)
         :southeast (.. region :bellybrush-road)}}
