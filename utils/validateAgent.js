const _ = require("lodash");
const { validateAllowedFields } = require("./helpers");
const { validateIfi } = require("./validateIfi");

const agentAllowedFields = [
  "objectType",
  "name",
  "member",
  "mbox",
  "mbox_sha1sum",
  "openid",
  "account",
];
const agent_ifis_can_only_be_one = [
  "mbox",
  "mbox_sha1sum",
  "openid",
  "account",
];
const validateAgent = (agent, placement) => {
  if (!_.isObject(agent)) {
    return {
      status: false,
      message: "Agent is not a properly formatted dictionary",
    };
  }
  if (!validateAllowedFields(agentAllowedFields, agent)) {
    return {
      status: false,
      message: "Agent/Group | Some field is incorrect. ",
    };
  }
  if (placement === "object" && !agent.objectType) {
    return {
      status: false,
      message:
        "objectType must be set when using an Agent as the object of a statement",
    };
  } else if (placement !== "object" && agent.objectType) {
    if (agent.objectType !== "Agent" && agent.objectType !== "Group") {
      return {
        status: false,
        message: "An agent's objectType must be either Agent or Group if given",
      };
    }
  } else if (placement !== "object" && !agent.objectType) {
    agent.objectType = "Agent";
  }
  let ifis = [];

  for (let item of agent_ifis_can_only_be_one) {
    if (agent[item]) {
      ifis.push(item);
    }
  }
  if (agent.objectType === "Agent" && ifis.length !== 1) {
    return {
      status: false,
      message: "One and only one of agent lists may be supplied with an Agent",
    };
  }
  if (agent.objectType === "Group" && ifis.length > 1) {
    return {
      status: false,
      message:
        "None or one and only one of agent lists may be supplied with a Group",
    };
  }

  if (agent.objectType == "Agent") {
    if ("name" in agent && !_.isString(agent.name)) {
      return {
        status: false,
        message: "If name is given in Agent, it must be a string",
      };
    }
    const isValidateIfi = validateIfi(ifis[0], agent[ifis[0]]);
    if (isValidateIfi.status === false) {
      return isValidateIfi;
    }
  } else {
    if ("name" in agent && !_.isString(agent.name)) {
      return {
        status: false,
        message: "If name is given in Group, it must be a string",
      };
    }
    if (_.isEmpty(ifis)) {
      if (agent.member) {
        return validateMembers(agent);
      } else {
        return {
          status: false,
          message: "Anonymous groups must contain member",
        };
      }
    } else {
      const isValidateIfi = validateIfi(ifis[0], agent[ifis[0]]);
      if (isValidateIfi.status === false) {
        return isValidateIfi;
      }
      if (agent.member) {
        return validateMembers(agent);
      }
    }
  }

  return {
    status: true,
  };
};

const validateAuthorityGroup = (authority) => {
  if (authority.member.length !== 2) {
    return {
      status: false,
      message: "Groups representing authorities must only contain 2 members",
    };
  }
  let check = 0;
  for (let key in authority) {
    if (key in agent_ifis_can_only_be_one) {
      check++;
    }
  }
  if (check > 2) {
    return {
      status: false,
      message:
        "Groups representing authorities must not contain an inverse functional identifier",
    };
  }
  return {
    status: true,
  };
};

const validateMembers = (agent) => {
  const member = agent.member;
  if (!_.isArray(member)) {
    return {
      status: false,
      message: "member is not a properly formatted array",
    };
  }
  if (_.isEmpty(member)) {
    return {
      status: false,
      message: "Member property must contain agents",
    };
  }
  for (let agent of member) {
    return validateAgent(agent, "member");
  }
};

module.exports = { validateAgent, validateMembers, validateAuthorityGroup };
