
var argv = require('minimist')(process.argv.slice(2));

var l = require("../utils/log").l;
var subRecord = !!argv.s;

var apps = null;
var utils = require("../utils/utils");
var processTime = utils.processTime;
var accumulablesObj = utils.accumulablesObj;
var mixinMongoMethods = require("../mongo/record").mixinMongoMethods;
var mixinMongoSubrecordMethods = require("../mongo/subrecord").mixinMongoSubrecordMethods;

function TaskAttempt(stageAttempt, id) {
  this.app = stageAttempt.app;
  this.stageAttempt = stageAttempt;
  this.job = stageAttempt.job;

  this.appId = stageAttempt.appId;
  this.stageId = stageAttempt.stageId;
  this.stageAttemptId = stageAttempt.id;
  this.id = id;

  if (subRecord) {
    this.super = stageAttempt;
    this.superKey = ['tasks', id, ''].join('.');
    this.set('id', id);
  } else {
    this.init(
          [ 'appId', 'stageId', 'stageAttemptId', 'id' ],
          'totalTaskDuration',
          [ this.stageAttempt, this.job, this.app ]
    );
  }
}

var getExecutorId = require('./executor').getExecutorId;

TaskAttempt.prototype.fromTaskInfo = function(ti) {
  this.set({
    'time.start': processTime(ti['Launch Time']),
    execId: getExecutorId(ti),
    locality: ti['Locality'],
    speculative: ti['Speculative'],
    GettingResultTime: processTime(ti['Getting Result Time']),
    index: ti['Index'],
    attempt: ti['Attempt']
  }).set({
    // This may have been set by metrics updates.
    'accumulables': accumulablesObj(ti['Accumulables']),
    // This may have been already set by a StageCompleted event.
    'time.end': processTime(ti['Finish Time'])
  }, true).setExecutors();
  return this;
};

TaskAttempt.prototype.setExecutors = function() {
  if (!this.executor && this.has('execId')) {
    var execId = this.get('execId');
    this.executor = this.app.getExecutor(execId);
    this.stageExecutor = this.stageAttempt.getExecutor(execId);
    this.durationAggregationObjs.push(this.executor);
    this.durationAggregationObjs.push(this.stageExecutor);
  }
  return this;
};

if (subRecord) {
  mixinMongoSubrecordMethods(TaskAttempt, "TaskAttempt");
} else {
  mixinMongoMethods(TaskAttempt, "TaskAttempt", "TaskAttempts");
}

module.exports.TaskAttempt = TaskAttempt;
