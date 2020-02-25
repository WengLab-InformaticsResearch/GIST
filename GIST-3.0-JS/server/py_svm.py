# -*-coding:utf-8 -*-

import sys
import numpy as np
import json
from sklearn import svm

from sklearn import preprocessing
import os
 
#start_time = datetime.datetime.now()     
#features = np.array(json.loads(sys.argv[1]))
#labels = np.array(json.loads(sys.argv[2]))
f= open("features","r+")
l=open("labels","r+")
features  = np.array(json.loads(f.read()))
labels = np.array(json.loads(l.read()))

'''
The labels are contious, so it needs to be encodded before training, 
and recovered the predicted categories to the original labels after prediction.
'''

lab_enc = preprocessing.LabelEncoder()
encoded = lab_enc.fit_transform(labels)
clf = svm.SVC(gamma='auto')
clf.fit(features,encoded)

predictions = clf.predict(features)
predictions_recovered = lab_enc.inverse_transform(predictions)
result = list(predictions_recovered)
f.close()
l.close()
print (result)

if os.path.exists("temp/features"):
  os.remove("temp/features")
if os.path.exists("temp/labels"):
  os.remove("temp/labels")
